import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { prepareRequestProtection, readIdempotentResponse, RequestProtectionError, saveIdempotentResponse } from "@/lib/request-protection";
import type { GroupOrderDraft, GroupPrintingOption } from "@/lib/group-orders";
import type { PublicProduct } from "@/lib/order-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ = "Africa/Casablanca";
const phonePattern = /^(05|06|07)[0-9]{8}$/;
const disabled = (): GroupPrintingOption => ({ enabled: false, type: "", text: "", logoPath: null });

function printing(value: GroupPrintingOption): GroupPrintingOption {
  if (!value || value.enabled !== true) return disabled();
  const text = typeof value.text === "string" ? value.text.trim() : "";
  const logoPath = typeof value.logoPath === "string" ? value.logoPath.trim() : null;
  if (!["text", "logo", "both"].includes(value.type)) throw new Error("اختر نوع الطباعة لكل موضع تم تفعيله.");
  if ((value.type === "text" || value.type === "both") && (!text || text.length > 500)) throw new Error("أدخل نص الطباعة المطلوب بشكل صحيح.");
  if ((value.type === "logo" || value.type === "both") && (!logoPath || !/^https:\/\//i.test(logoPath))) throw new Error("ارفع شعارًا صالحًا للطباعة.");
  return { enabled: true, type: value.type, text: value.type === "logo" ? "" : text, logoPath: value.type === "text" ? null : logoPath };
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) {
      return NextResponse.json({ error: "مصدر الطلب غير مسموح." }, { status: 403 });
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 48_000) {
      return NextResponse.json({ error: "حجم بيانات الطلب أكبر من المسموح." }, { status: 413 });
    }
    const body = JSON.parse(rawBody) as { draft?: GroupOrderDraft };
    const draft = body?.draft;
    if (!draft || !["شراء", "كراء"].includes(draft.orderType)) throw new Error("بيانات الطلب الجماعي غير صالحة.");
    const quantity = Number(draft.quantity);
    if (!Number.isInteger(quantity) || quantity < 5) throw new Error("الحد الأدنى للطلب الجماعي هو 5 أشخاص.");
    if (quantity > 100) throw new Error("للطلبات التي تتجاوز 100 شخص، يرجى التواصل معنا عبر WhatsApp.");
    if (draft.orderType === "كراء" && draft.productType !== "fullOutfit") throw new Error("خيار الوشاح والقبعة فقط متاح للشراء وليس للكراء.");
    const name = String(draft.responsibleName ?? "").trim();
    const phone = String(draft.phoneNumber ?? "").replace(/\s+/g, "");
    const city = String(draft.city ?? "").trim();
    const address = String(draft.address ?? "").trim();
    const notes = String(draft.notes ?? "").trim().slice(0, 1000);
    if (name.length < 3 || name.length > 120) throw new Error("أدخل اسم المسؤول عن الطلب.");
    if (!phonePattern.test(phone)) throw new Error("أدخل رقم هاتف مغربي صحيح.");
    if (!city || city.length > 80) throw new Error("اختر المدينة.");
    if (!["pickup", "homeDelivery"].includes(draft.deliveryMethod)) throw new Error("طريقة التوصيل غير صالحة.");
    if (draft.deliveryMethod === "homeDelivery" && (address.length < 3 || address.length > 500)) throw new Error("أدخل عنوان التوصيل.");
    if (!/^(09|10|11|12|13|14|15|16|17|18|19|20|21):00$/.test(String(draft.deliveryTime ?? ""))) throw new Error("اختر وقتًا صالحًا للموعد.");
    const scheduled = DateTime.fromISO(`${draft.deliveryDate}T${draft.deliveryTime}`, { zone: TZ });
    if (!scheduled.isValid || !/^\d{4}-\d{2}-\d{2}$/.test(draft.deliveryDate)) throw new Error("موعد الطلب غير صالح.");


    const members = Array.isArray(draft.members) ? draft.members.map((x) => String(x).trim()).filter(Boolean) : [];
    const excelUrl = draft.orderType === "شراء" ? String(draft.membersExcelUrl ?? "").trim() || null : null;
    const excelName = draft.orderType === "شراء" ? String(draft.membersExcelName ?? "").trim() || null : null;
    if (draft.orderType === "شراء") {
      if (excelUrl) {
        if (!/^https:\/\//i.test(excelUrl) || excelUrl.length > 2048 || !excelName || excelName.length > 180) throw new Error("ملف Excel المرفق غير صالح. أعد رفع الملف.");
      } else if (members.length !== quantity) {
        throw new Error("أدخل اسمًا لكل فرد أو أرفق ملف Excel يحتوي على أسماء المجموعة.");
      }
      if (members.length > 100 || members.some((member) => !member || member.length > 120)) throw new Error("تحقق من أسماء أفراد المجموعة.");
    }
    if (!["fullOutfit", "shawlAndCap"].includes(draft.productType)) throw new Error("نوع المنتج غير صالح.");
    const isPurchase = draft.orderType === "شراء";
    const referenceImages = isPurchase && Array.isArray(draft.referenceImages) ? draft.referenceImages : [];
    if (referenceImages.length > 8 || referenceImages.some((url) => typeof url !== "string" || !/^https:\/\//i.test(url) || url.length > 2048)) {
      throw new Error("يمكن رفع حتى 8 صور مرجعية صالحة.");
    }
    const rightShawl = isPurchase ? printing(draft.rightShawl) : disabled();
    const leftShawl = isPurchase ? printing(draft.leftShawl) : disabled();
    const backShawl = isPurchase ? printing(draft.backShawl) : disabled();
    const cap = isPurchase ? printing(draft.cap) : disabled();
    const db = getAdminFirestore();
    const protection = await prepareRequestProtection({
      db,
      request,
      scope: "group-order",
      rawBody,
      idempotencyKey: request.headers.get("idempotency-key"),
      maxRequests: 3,
      windowMs: 60 * 60 * 1000,
    });
    if (protection.replay) return NextResponse.json(protection.replay, { status: 200 });
    if (draft.fabric !== "ساتان" && draft.fabric !== "موبرة") throw new Error("اختر نوع القماش.");
    const shawlColor = String(draft.shawlColor ?? "").trim();
    if (!shawlColor || shawlColor.length > 80) throw new Error("أدخل لون الوشاح بشكل صحيح.");
    const [productsSnap, citiesSnap, rulesSnap] = await Promise.all([
      db.collection("products").get(), db.collection("delivery_settings").get(), db.doc("settings/order_rules").get(),
    ]);
    const product = productsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as PublicProduct)
      .find((item) => item.productType === (draft.orderType === "كراء" ? "fullOutfit" : draft.productType) && item.active !== false);
    if (!product) throw new Error("المنتج المحدد غير متاح حاليًا.");
    const baseUnitPrice = draft.orderType === "شراء"
      ? (draft.fabric === "ساتان" ? Number(product.purchaseSatin) : Number(product.purchaseMoubara))
      : (draft.fabric === "ساتان" ? Number(product.rentalSatin) : Number(product.rentalMoubara));
    if (!Number.isSafeInteger(baseUnitPrice) || baseUnitPrice < 0) throw new Error("سعر المنتج غير مضبوط.");
    const unitPriceApplied = baseUnitPrice + (isPurchase
      ? (rightShawl.enabled || leftShawl.enabled || backShawl.enabled ? 40 : 0) + (cap.enabled ? 40 : 0) : 0);
    const defaults = [
      ["Fes", "fes", 20], ["Meknes", "city_meknes", 50], ["Sefrou", "city_sefrou", 50],
      ["Ifrane", "city_ifrane", 50], ["El Hajeb", "city_el_hajeb", 50], ["Taza", "city_taza", 50],
      ["Rabat", "city_rabat", 60], ["Casablanca", "city_casablanca", 60], ["Marrakech", "city_marrakech", 60],
      ["Tangier", "city_tangier", 60], ["Agadir", "city_agadir", 60], ["Oujda", "city_oujda", 60],
      ["Tetouan", "city_tetouan", 60], ["Nador", "city_nador", 60],
    ];
    const cityMap = new Map(defaults.map(([name, id, price]) => [String(name), { id: String(id), name: String(name), price: Number(price) }]));
    citiesSnap.docs.forEach((doc) => {
      const item = doc.data();
      if (item.type === "city" && item.active !== false && typeof item.name === "string" && item.name.trim() && item.name.trim() !== "Fes") {
        cityMap.set(item.name.trim(), { id: doc.id, name: item.name.trim(), price: Number(item.price) });
      }
    });
    const selectedCity = cityMap.get(city);
    if (!selectedCity || !Number.isSafeInteger(selectedCity.price) || selectedCity.price < 0) throw new Error("مدينة التوصيل المحددة غير متاحة حاليًا.");
    const deliveryFeeApplied = draft.deliveryMethod === "pickup" ? 0 : selectedCity.price;
    const deliveryPricingDocumentId = draft.deliveryMethod === "pickup" ? "" : selectedCity.id;
    const productTotalEstimate = unitPriceApplied * quantity;
    const totalPriceEstimate = productTotalEstimate + deliveryFeeApplied;
    if (!Number.isSafeInteger(productTotalEstimate) || !Number.isSafeInteger(totalPriceEstimate)) {
      throw new Error("إجمالي سعر الطلب الجماعي خارج النطاق المسموح.");
    }
    const rules = rulesSnap.exists ? rulesSnap.data() ?? {} : {};
    const purchasePreparationDaysApplied = Number.isSafeInteger(rules.purchasePreparationDays) ? Number(rules.purchasePreparationDays) : 2;
    const rentalAdvanceHoursApplied = Number.isSafeInteger(rules.rentalAdvanceHours) ? Number(rules.rentalAdvanceHours) : 24;
    const minimumSchedule = draft.orderType === "شراء"
      ? DateTime.now().setZone(TZ).plus({ days: purchasePreparationDaysApplied })
      : DateTime.now().setZone(TZ).plus({ hours: rentalAdvanceHoursApplied });
    if (scheduled < minimumSchedule) {
      throw new Error(draft.orderType === "شراء"
        ? `الشراء الجماعي يحتاج ${purchasePreparationDaysApplied} يوم/أيام على الأقل للتحضير.`
        : `الكراء الجماعي يحتاج حجزًا مسبقًا بـ${rentalAdvanceHoursApplied} ساعة على الأقل.`);
    }

    const shopSnap = await db.doc("settings/shop").get();
    const shop = shopSnap.exists ? shopSnap.data() ?? {} : {};
    if (shop.acceptingOrders === false || shop.maintenanceMode === true ||
        (isPurchase && shop.purchaseEnabled === false) || (!isPurchase && shop.rentalEnabled === false)) {
      throw new Error("استقبال هذا النوع من الطلبات متوقف مؤقتًا.");
    }
    const rentalSecurityDepositUnit = !isPurchase
      ? Math.max(0, Number(draft.fabric === "ساتان"
        ? shop.rentalSecurityDepositSatin ?? 250
        : shop.rentalSecurityDepositMoubara ?? 300) || 0)
      : 0;
    if (!isPurchase && (!Number.isSafeInteger(rentalSecurityDepositUnit) || rentalSecurityDepositUnit <= 0)) {
      throw new Error("قيمة ضمان الكراء غير مضبوطة.");
    }
    const rentalSecurityDepositAmount = rentalSecurityDepositUnit * quantity;
    if (!Number.isSafeInteger(rentalSecurityDepositAmount)) {
      throw new Error("إجمالي ضمان الكراء الجماعي خارج النطاق المسموح.");
    }
    const amountDueNowEstimate = !isPurchase
      ? rentalSecurityDepositAmount + deliveryFeeApplied
      : totalPriceEstimate;
    if (!Number.isSafeInteger(amountDueNowEstimate)) {
      throw new Error("المبلغ المطلوب عند الاستلام خارج النطاق المسموح.");
    }

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const suffix = Array.from(bytes, (value) => chars[value % chars.length]).join("");
    const year = DateTime.now().setZone(TZ).year;
    const number = `GRP-${year}-${suffix}`;
    const returnAt = !isPurchase ? scheduled.plus({ hours: 24 }) : null;
    const transactionResult = await db.runTransaction(async (transaction) => {
      const cached = await readIdempotentResponse(transaction, protection);
      if (cached) return { response: cached, replay: true as const };
      const ref = db.doc(`group_orders/${number}`);
      const trackingRef = db.doc(`order_tracking/${number}`);
      const phoneLookupRef = db.doc(`tracking_phone_lookup/${phone}`);
      const lookupSnap = await transaction.get(phoneLookupRef);
      const lookupData = lookupSnap.exists ? lookupSnap.data() ?? {} : {};
      const previous = Array.isArray(lookupData.orderNumbers)
        ? lookupData.orderNumbers.filter((value: unknown) => typeof value === "string" && (/^GM-[0-9]{4}-[0-9]{6}$/.test(value) || /^GRP-[0-9]{4}-[A-HJ-NP-Z2-9]{8}$/.test(value)))
        : typeof lookupData.orderNumber === "string" ? [lookupData.orderNumber] : [];
      transaction.create(ref, {
        groupOrderNumber: number, orderType: draft.orderType, quantity,
        responsibleName: name, phoneNumber: phone, city,
        deliveryMethod: draft.deliveryMethod, address: draft.deliveryMethod === "pickup" ? "" : address,
        scheduledAt: Timestamp.fromDate(scheduled.toUTC().toJSDate()),
        returnAt: returnAt ? Timestamp.fromDate(returnAt.toUTC().toJSDate()) : null,
        members: isPurchase && !excelUrl ? members : [],
        membersExcelUrl: excelUrl, membersExcelName: excelName,
        productType: isPurchase ? draft.productType : "fullOutfit",
        rightShawl, leftShawl, backShawl, cap, referenceImages,
        customizationScope: "shared_group_design", notes,
        catalogProductId: product.id, fabric: draft.fabric, shawlColor,
        unitPriceApplied, productTotalEstimate, deliveryFeeApplied, deliveryPricingDocumentId,
        totalPriceEstimate, amountDueNowEstimate, priceEstimateCurrency: "MAD",
        ...(isPurchase ? {} : {
          rentalFeeAmount: productTotalEstimate,
          rentalSecurityDepositUnit,
          rentalSecurityDepositAmount,
          rentalDepositCollectedAmount: 0,
          rentalDepositStatus: "pending",
          rentalReturnStatus: "awaiting_return",
          rentalDamageDeduction: 0,
          rentalRefundAmount: null,
          rentalAdditionalDamageDue: 0,
          rentalSettlementStatus: "pending",
        }),
        priceEstimateBasis: "current_catalog_prices_no_group_discount",
        purchasePreparationDaysApplied, rentalAdvanceHoursApplied,
        status: "received", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(trackingRef, {
        orderNumber: number, status: "received", orderType: draft.orderType,
        productType: isPurchase ? draft.productType : "fullOutfit", quantity,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(phoneLookupRef, {
        orderNumber: number, latestOrderNumber: number,
        orderNumbers: [...new Set([...previous, number])],
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      const response = { groupOrderNumber: number };
      saveIdempotentResponse(transaction, protection, response);
      return { response, replay: false as const };
    });
    return NextResponse.json(transactionResult.response, { status: transactionResult.replay ? 200 : 201 });
  } catch (error) {
    if (error instanceof RequestProtectionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, ...(error.retryAfterSeconds ? { headers: { "Retry-After": String(error.retryAfterSeconds) } } : {}) },
      );
    }
    const message = error instanceof Error ? error.message : "تعذر إرسال الطلب الجماعي.";
    const status = /not configured|service-account/i.test(message) ? 503 : 400;
    return NextResponse.json({ error: status === 503 ? "الخادم غير مكتمل الإعداد بعد." : message }, { status });
  }
}
