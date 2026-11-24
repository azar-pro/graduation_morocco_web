import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import type { GroupOrderDraft, GroupPrintingOption } from "@/lib/group-orders";

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
    if (Number(request.headers.get("content-length") ?? 0) > 48_000) {
      return NextResponse.json({ error: "حجم بيانات الطلب أكبر من المسموح." }, { status: 413 });
    }
    const body = await request.json() as { draft?: GroupOrderDraft };
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
    if (scheduled < DateTime.now().setZone(TZ).plus({ hours: 24 })) throw new Error("الطلب الجماعي يحتاج حجزًا قبل 24 ساعة على الأقل.");

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
    const shopSnap = await db.doc("settings/shop").get();
    const shop = shopSnap.exists ? shopSnap.data() ?? {} : {};
    if (shop.acceptingOrders === false || shop.maintenanceMode === true ||
        (isPurchase && shop.purchaseEnabled === false) || (!isPurchase && shop.rentalEnabled === false)) {
      throw new Error("استقبال هذا النوع من الطلبات متوقف مؤقتًا.");
    }

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const suffix = Array.from(bytes, (value) => chars[value % chars.length]).join("");
    const year = DateTime.now().setZone(TZ).year;
    const number = `GRP-${year}-${suffix}`;
    const returnAt = !isPurchase ? scheduled.plus({ hours: 24 }) : null;
    await db.runTransaction(async (transaction) => {
      const ref = db.doc(`group_orders/${number}`);
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
        status: "received", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return NextResponse.json({ groupOrderNumber: number }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر إرسال الطلب الجماعي.";
    const status = /not configured|service-account/i.test(message) ? 503 : 400;
    return NextResponse.json({ error: status === 503 ? "الخادم غير مكتمل الإعداد بعد." : message }, { status });
  }
}
