import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { prepareRequestProtection, readIdempotentResponse, RequestProtectionError, saveIdempotentResponse } from "@/lib/request-protection";
import type { OrderDraft, PrintingOption } from "@/lib/order-service";
import type { DeliveryCity, OrderRules, PublicProduct, ShopSettings } from "@/lib/order-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ = "Africa/Casablanca";
const phonePattern = /^(05|06|07)[0-9]{8}$/;
const DEFAULT_CITIES: DeliveryCity[] = [
  { id: "fes", name: "Fes", price: 20, active: true },
  { id: "city_meknes", name: "Meknes", price: 50, active: true },
  { id: "city_sefrou", name: "Sefrou", price: 50, active: true },
  { id: "city_ifrane", name: "Ifrane", price: 50, active: true },
  { id: "city_el_hajeb", name: "El Hajeb", price: 50, active: true },
  { id: "city_taza", name: "Taza", price: 50, active: true },
  { id: "city_rabat", name: "Rabat", price: 60, active: true },
  { id: "city_casablanca", name: "Casablanca", price: 60, active: true },
  { id: "city_marrakech", name: "Marrakech", price: 60, active: true },
  { id: "city_tangier", name: "Tangier", price: 60, active: true },
  { id: "city_agadir", name: "Agadir", price: 60, active: true },
  { id: "city_oujda", name: "Oujda", price: 60, active: true },
  { id: "city_tetouan", name: "Tetouan", price: 60, active: true },
  { id: "city_nador", name: "Nador", price: 60, active: true },
];
const disabledPrinting = (): PrintingOption => ({ enabled: false, type: "", text: "", logoPath: null });

function normalizePrinting(option: PrintingOption): PrintingOption {
  if (!option || option.enabled !== true) return disabledPrinting();
  const text = typeof option.text === "string" ? option.text.trim() : "";
  const logoPath = typeof option.logoPath === "string" ? option.logoPath.trim() : null;
  if (!["text", "logo", "both"].includes(option.type)) throw new Error("اختر نوع الطباعة.");
  if ((option.type === "text" || option.type === "both") && (!text || text.length > 500)) {
    throw new Error("أدخل نص الطباعة المطلوب بشكل صحيح.");
  }
  if ((option.type === "logo" || option.type === "both") && (!logoPath || !/^https:\/\//i.test(logoPath))) {
    throw new Error("ارفع شعارًا صالحًا للطباعة.");
  }
  return {
    enabled: true,
    type: option.type,
    text: option.type === "logo" ? "" : text,
    logoPath: option.type === "text" ? null : logoPath,
  };
}

function readShop(data: Record<string, unknown>): ShopSettings {
  const bool = (key: keyof ShopSettings, fallback: boolean) =>
    typeof data[key] === "boolean" ? data[key] as boolean : fallback;
  const number = (key: keyof ShopSettings, fallback: number) =>
    typeof data[key] === "number" && Number.isFinite(data[key]) ? Math.trunc(data[key] as number) : fallback;
  return {
    acceptingOrders: bool("acceptingOrders", true),
    purchaseEnabled: bool("purchaseEnabled", true),
    rentalEnabled: bool("rentalEnabled", true),
    maintenanceMode: bool("maintenanceMode", false),
    cashAtStoreEnabled: bool("cashAtStoreEnabled", true),
    bankTransferEnabled: bool("bankTransferEnabled", true),
    cashTransferAgencyEnabled: bool("cashTransferAgencyEnabled", true),
    depositPaymentEnabled: bool("depositPaymentEnabled", true),
    fullPaymentEnabled: bool("fullPaymentEnabled", true),
    paymentDeadlineHours: number("paymentDeadlineHours", 48),
    depositPercentage: number("depositPercentage", 50),
    rentalSecurityDepositSatin: Math.max(0, number("rentalSecurityDepositSatin", 250)),
    rentalSecurityDepositMoubara: Math.max(0, number("rentalSecurityDepositMoubara", 300)),
  };
}

function readRules(data: Record<string, unknown>): OrderRules {
  const number = (key: keyof OrderRules, fallback: number) =>
    typeof data[key] === "number" && Number.isFinite(data[key]) ? Math.trunc(data[key] as number) : fallback;
  return {
    purchasePreparationDays: number("purchasePreparationDays", 2),
    rentalAdvanceHours: number("rentalAdvanceHours", 24),
    urgentOrdersEnabled: data.urgentOrdersEnabled === true,
    urgentMinimumHours: number("urgentMinimumHours", 12),
  };
}

function validateAndBuild(draft: OrderDraft, products: PublicProduct[], cities: DeliveryCity[], shop: ShopSettings, rules: OrderRules) {
  if (!draft || typeof draft !== "object") throw new Error("بيانات الطلب غير صالحة.");
  if (!["شراء", "كراء"].includes(draft.orderType)) throw new Error("نوع الطلب غير صالح.");
  if (!["fullOutfit", "shawlAndCap", "shawlOnly"].includes(draft.productType)) throw new Error("المنتج المحدد غير صالح.");
  if (!["ساتان", "موبرة"].includes(draft.fabric)) throw new Error("نوع القماش غير صالح.");
  if (shop.maintenanceMode || !shop.acceptingOrders) throw new Error("استقبال الطلبات متوقف مؤقتًا.");
  if (draft.orderType === "شراء" && !shop.purchaseEnabled) throw new Error("طلبات الشراء متوقفة مؤقتًا.");
  if (draft.orderType === "كراء" && !shop.rentalEnabled) throw new Error("طلبات الكراء متوقفة مؤقتًا.");

  const fullName = String(draft.fullName ?? "").trim();
  const phone = String(draft.phoneNumber ?? "").replace(/\s+/g, "");
  const address = String(draft.address ?? "").trim();
  const cityName = String(draft.city ?? "").trim();
  const shawlColor = String(draft.shawlColor ?? "").trim();
  if (fullName.length < 3 || fullName.length > 120) throw new Error("أدخل الاسم الكامل بشكل صحيح.");
  if (!phonePattern.test(phone)) throw new Error("أدخل رقم هاتف مغربي صحيح يبدأ بـ05 أو 06 أو 07.");
  if (!shawlColor || shawlColor.length > 80) throw new Error("اختر لون الوشاح.");
  if (draft.productType !== "shawlOnly" && !["ذكر", "أنثى"].includes(draft.gender)) throw new Error("اختر الجنس بشكل صحيح.");
  if (String(draft.notes ?? "").length > 1000 || String(draft.deliveryNotes ?? "").length > 1000) throw new Error("الملاحظات أطول من المسموح.");
  if (!cityName || cityName.length > 80) throw new Error("اختر المدينة.");
  if (draft.deliveryMethod !== "pickup" && draft.deliveryMethod !== "homeDelivery") throw new Error("طريقة التوصيل غير صالحة.");
  if (draft.deliveryMethod === "homeDelivery" && (address.length < 3 || address.length > 500)) throw new Error("أدخل عنوان التوصيل.");
  if (!/^(09|10|11|12|13|14|15|16|17|18|19|20|21):00$/.test(String(draft.deliveryTime ?? ""))) throw new Error("اختر وقتًا صالحًا للموعد.");
  const scheduled = DateTime.fromISO(`${draft.deliveryDate}T${draft.deliveryTime}`, { zone: TZ });
  if (!scheduled.isValid || !/^\d{4}-\d{2}-\d{2}$/.test(draft.deliveryDate)) throw new Error("موعد الطلب غير صالح.");
  const now = DateTime.now().setZone(TZ);
  const minimum = draft.orderType === "شراء" ? now.plus({ days: rules.purchasePreparationDays }) : now.plus({ hours: rules.rentalAdvanceHours });
  if (scheduled < minimum) throw new Error(draft.orderType === "شراء"
    ? `الشراء يحتاج على الأقل ${rules.purchasePreparationDays} يوم/أيام للتحضير.`
    : `الكراء يحتاج حجزًا مسبقًا بـ${rules.rentalAdvanceHours} ساعة على الأقل.`);

  const product = products.find((item) => item.productType === draft.productType && item.active);
  if (!product) throw new Error("المنتج المحدد غير متاح حاليًا.");
  const basePrice = draft.orderType === "شراء"
    ? (draft.fabric === "ساتان" ? product.purchaseSatin : product.purchaseMoubara)
    : (draft.fabric === "ساتان" ? product.rentalSatin : product.rentalMoubara);
  if (!Number.isSafeInteger(basePrice) || basePrice < 0) throw new Error("سعر المنتج غير مضبوط.");

  let rightShawl = disabledPrinting(), leftShawl = disabledPrinting(), backShawl = disabledPrinting(), cap = disabledPrinting();
  let referenceImages: string[] = [];
  if (draft.orderType === "كراء") {
    if ([draft.rightShawl, draft.leftShawl, draft.backShawl, draft.cap].some((option) => option?.enabled) || (draft.referenceImages?.length ?? 0) > 0) {
      throw new Error("الطباعة والصور المرجعية متاحة للشراء فقط.");
    }
  } else {
    rightShawl = normalizePrinting(draft.rightShawl);
    leftShawl = normalizePrinting(draft.leftShawl);
    backShawl = normalizePrinting(draft.backShawl);
    cap = draft.productType === "shawlOnly" ? disabledPrinting() : normalizePrinting(draft.cap);
    referenceImages = Array.isArray(draft.referenceImages) ? draft.referenceImages : [];
    if (referenceImages.length > 4 || referenceImages.some((url) => typeof url !== "string" || !/^https:\/\//i.test(url) || url.length > 2048)) {
      throw new Error("يمكن رفع حتى 4 صور مرجعية صالحة.");
    }
  }

  const hasShawlPrinting = rightShawl.enabled || leftShawl.enabled || backShawl.enabled;
  const hasCapPrinting = draft.productType !== "shawlOnly" && cap.enabled;
  const productPrice = basePrice + (draft.orderType === "شراء" ? (hasShawlPrinting ? 40 : 0) + (hasCapPrinting ? 40 : 0) : 0);
  if (!Number.isSafeInteger(productPrice) || productPrice < 0) throw new Error("إجمالي سعر المنتج غير صالح.");
  let deliveryFee = 0, deliveryDocumentId = "";
  if (draft.deliveryMethod === "homeDelivery") {
    if (cityName === "Fes") {
      deliveryFee = 20;
      deliveryDocumentId = "fes";
    } else {
      const city = cities.find((item) => item.name === cityName && item.active);
      if (!city || !Number.isSafeInteger(city.price) || city.price < 0) throw new Error("مدينة التوصيل المحددة غير متاحة حاليًا.");
      deliveryFee = city.price;
      deliveryDocumentId = city.id;
    }
  }
  const rentalSecurityDeposit = draft.orderType === "كراء"
    ? (draft.fabric === "ساتان" ? shop.rentalSecurityDepositSatin : shop.rentalSecurityDepositMoubara)
    : 0;
  const total = productPrice + deliveryFee;
  if (!Number.isSafeInteger(total) || total < 0) throw new Error("إجمالي الطلب خارج النطاق المسموح.");

  if (draft.paymentMethod === "cash_at_store") {
    if (!shop.cashAtStoreEnabled || draft.deliveryMethod !== "pickup" || cityName !== "Fes") throw new Error("الدفع نقدًا عند المحل غير متاح لهذا الطلب.");
  } else if (draft.paymentMethod === "bank_transfer") {
    if (!shop.bankTransferEnabled) throw new Error("التحويل البنكي غير متاح حاليًا.");
  } else if (draft.paymentMethod === "cash_transfer_agency") {
    if (!shop.cashTransferAgencyEnabled) throw new Error("التحويل عبر وكالة غير متاح حاليًا.");
    if (!["cash_plus", "wafacash", "western_union", "other"].includes(draft.paymentProvider)) throw new Error("اختر وكالة التحويل.");
  } else {
    throw new Error("طريقة الدفع غير صالحة.");
  }
  if (draft.paymentMethod !== "cash_at_store" && draft.orderType === "شراء") {
    if (draft.bankTransferPlan === "deposit" && !shop.depositPaymentEnabled) throw new Error("خيار التسبيق غير متاح حاليًا.");
    if (draft.bankTransferPlan === "full" && !shop.fullPaymentEnabled) throw new Error("خيار الدفع الكامل غير متاح حاليًا.");
    if (!["deposit", "full"].includes(draft.bankTransferPlan)) throw new Error("اختر طريقة إتمام الدفع.");
  }
  if (draft.paymentMethod !== "cash_at_store" && draft.orderType === "كراء" && draft.bankTransferPlan !== "") {
    throw new Error("خطة الدفع غير صالحة لطلب الكراء.");
  }

  return {
    product, fullName, phone, address, cityName, shawlColor, scheduled,
    productPrice, deliveryFee, deliveryDocumentId, rentalSecurityDeposit, total,
    rightShawl, leftShawl, backShawl, cap, referenceImages,
  };
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
    const body = JSON.parse(rawBody) as { draft?: OrderDraft };
    const draft = body?.draft;
    if (!draft) throw new Error("بيانات الطلب غير صالحة.");
    const db = getAdminFirestore();
    const protection = await prepareRequestProtection({
      db,
      request,
      scope: "individual-order",
      rawBody,
      idempotencyKey: request.headers.get("idempotency-key"),
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (protection.replay) return NextResponse.json(protection.replay, { status: 200 });

    const [productsSnap, citiesSnap, shopSnap, rulesSnap] = await Promise.all([
      db.collection("products").get(),
      db.collection("delivery_settings").where("type", "==", "city").get(),
      db.doc("settings/shop").get(),
      db.doc("settings/order_rules").get(),
    ]);

    const products = productsSnap.docs.map((snap) => {
      const d = snap.data();
      return {
        id: snap.id, productType: d.productType, nameAr: d.nameAr ?? d.name ?? "منتج تخرج",
        nameEn: d.nameEn ?? "", active: d.active !== false,
        purchaseSatin: d.purchaseSatin, purchaseMoubara: d.purchaseMoubara,
        rentalSatin: d.rentalSatin, rentalMoubara: d.rentalMoubara,
      } as PublicProduct;
    });
    const cityMap = new Map(DEFAULT_CITIES.map((city) => [city.name, city]));
    for (const snap of citiesSnap.docs) {
      const d = snap.data();
      const name = String(d.name ?? "").trim();
      if (!name || name === "Fes" || d.active === false) continue;
      cityMap.set(name, {
        id: snap.id,
        name,
        price: Number.isFinite(d.price) ? Math.trunc(d.price) : 60,
        active: true,
      });
    }
    const cities = [...cityMap.values()];
    const shop = readShop(shopSnap.exists ? shopSnap.data() ?? {} : {});
    const rules = readRules(rulesSnap.exists ? rulesSnap.data() ?? {} : {});
    const order = validateAndBuild(draft, products, cities, shop, rules);

    const year = DateTime.now().setZone(TZ).year;
    const counterRef = db.doc(`order_number_counters/${year}`);
    const transactionResult = await db.runTransaction(async (transaction) => {
      const cached = await readIdempotentResponse(transaction, protection);
      if (cached) return { response: cached, replay: true as const };
      const counterSnap = await transaction.get(counterRef);
      const initial = year === 2026 ? 17 : 0;
      const stored = counterSnap.exists ? Number(counterSnap.data()?.lastNumber ?? initial) : initial;
      if (!Number.isSafeInteger(stored) || stored < 0 || stored > 999998) throw new Error("تعذر إنشاء رقم الطلب. يرجى التواصل معنا.");
      const next = stored + 1;
      const number = `GM-${year}-${String(next).padStart(6, "0")}`;
      const orderRef = db.doc(`orders/${number}`);
      const trackingRef = db.doc(`order_tracking/${number}`);
      const returnAt = order.scheduled.plus({ hours: 24 });
      const isRental = draft.orderType === "كراء";
      const isProofPayment = draft.paymentMethod !== "cash_at_store";
      const deadlineHours = Math.max(1, Math.min(720, shop.paymentDeadlineHours));
      const depositPercentage = Math.max(1, Math.min(100, shop.depositPercentage));
      const depositAmount = isRental || draft.bankTransferPlan !== "deposit" || !isProofPayment
        ? null : Math.round(order.total * depositPercentage / 100);
      if (depositAmount !== null && (!Number.isSafeInteger(depositAmount) || depositAmount < 0 || depositAmount > order.total)) {
        throw new Error("قيمة التسبيق المحسوبة غير صالحة.");
      }
      const orderData: Record<string, unknown> = {
        orderNumber: number, orderYear: String(year), orderSequenceNumber: next,
        status: "received", paymentStatus: "pending", paymentMethod: draft.paymentMethod,
        bankTransferPlan: isProofPayment && !isRental ? draft.bankTransferPlan : "",
        paymentProvider: draft.paymentMethod === "cash_transfer_agency" ? draft.paymentProvider : "",
        paymentDeadline: null, totalPrice: order.total,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        gender: draft.productType === "shawlOnly" ? "" : draft.gender,
        orderType: draft.orderType, productType: draft.productType,
        catalogProductId: order.product.id, catalogProductNameAr: order.product.nameAr,
        catalogProductNameEn: order.product.nameEn ?? "", fabric: draft.fabric,
        shawlColor: order.shawlColor, notes: String(draft.notes ?? "").trim().slice(0, 1000),
        deliveryMethod: draft.deliveryMethod, fullName: order.fullName, phoneNumber: order.phone,
        city: order.cityName, address: draft.deliveryMethod === "pickup" ? "" : order.address,
        deliveryNotes: String(draft.deliveryNotes ?? "").trim().slice(0, 1000),
        deliveryDate: draft.deliveryDate, deliveryTime: draft.deliveryTime,
        returnDate: isRental ? returnAt.setZone(TZ).toFormat("yyyy-MM-dd") : null,
        returnTime: isRental ? returnAt.setZone(TZ).toFormat("HH:mm") : "",
        urgentOrder: false, deliveryFee: order.deliveryFee, fesArea: null,
        rightShawl: order.rightShawl, leftShawl: order.leftShawl, backShawl: order.backShawl,
        cap: order.cap, referenceImages: order.referenceImages,
        productPriceApplied: order.productPrice, deliveryFeeApplied: order.deliveryFee,
        deliveryPricingDocumentId: order.deliveryDocumentId, amountPaid: 0,
        remainingAmount: order.total, trackingPhoneKey: order.phone,
        scheduledAt: Timestamp.fromDate(order.scheduled.toUTC().toJSDate()),
        purchasePreparationDaysApplied: rules.purchasePreparationDays,
        rentalAdvanceHoursApplied: rules.rentalAdvanceHours, scheduleTimeZone: TZ,
      };
      if (isRental) Object.assign(orderData, {
        returnAt: Timestamp.fromDate(returnAt.toUTC().toJSDate()),
        rentalFeeAmount: order.productPrice,
        rentalSecurityDepositAmount: order.rentalSecurityDeposit,
        rentalDepositCollectedAmount: 0, rentalDepositStatus: "pending",
        rentalReturnStatus: "awaiting_return", rentalDamageDeduction: 0,
        rentalRefundAmount: null, rentalAdditionalDamageDue: 0, rentalSettlementStatus: "pending",
      });
      if (isProofPayment) {
        orderData.paymentDeadlineHoursApplied = deadlineHours;
        orderData.paymentDeadlineTimeZone = TZ;
        if (!isRental && draft.bankTransferPlan === "deposit") {
          orderData.depositPercentageApplied = depositPercentage;
          orderData.depositRequiredAmount = depositAmount;
        }
      }
      transaction.create(orderRef, orderData);
      transaction.create(trackingRef, {
        orderNumber: number, status: "received", orderType: draft.orderType,
        productType: draft.productType, createdAt: FieldValue.serverTimestamp(),
        ...(isProofPayment ? { paymentDeadlineHoursApplied: deadlineHours } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(counterRef, {
        lastNumber: next, lastOrderNumber: number, reconciledWithSavedOrders: true,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      const response = { orderNumber: number, quote: {
        productPrice: order.productPrice, deliveryFee: order.deliveryFee, total: order.total,
        rentalSecurityDeposit: order.rentalSecurityDeposit,
        amountDueNow: isRental ? order.rentalSecurityDeposit + order.deliveryFee : order.total,
      }};
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
    const message = error instanceof Error ? error.message : "تعذر إرسال الطلب.";
    const status = /not configured|service-account/i.test(message) ? 503 : 400;
    return NextResponse.json({ error: status === 503 ? "الخادم غير مكتمل الإعداد بعد." : message }, { status });
  }
}
