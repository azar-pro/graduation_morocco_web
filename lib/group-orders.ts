"use client";

import { DateTime } from "luxon";

export type GroupPrintingOption = {
  enabled: boolean;
  type: "" | "text" | "logo" | "both";
  text: string;
  logoPath: string | null;
};

export type GroupOrderDraft = {
  orderType: "شراء" | "كراء";
  quantity: number;
  responsibleName: string;
  phoneNumber: string;
  city: string;
  deliveryMethod: "homeDelivery" | "pickup";
  address: string;
  deliveryDate: string;
  deliveryTime: string;
  members: string[];
  membersExcelUrl?: string | null;
  membersExcelName?: string | null;
  productType: "fullOutfit" | "shawlAndCap";
  fabric: "ساتان" | "موبرة";
  shawlColor: string;
  rightShawl: GroupPrintingOption;
  leftShawl: GroupPrintingOption;
  backShawl: GroupPrintingOption;
  cap: GroupPrintingOption;
  referenceImages: string[];
  notes: string;
};

const TZ = "Africa/Casablanca";
const phonePattern = /^(05|06|07)[0-9]{8}$/;
const disabledPrinting = (): GroupPrintingOption => ({
  enabled: false, type: "", text: "", logoPath: null,
});


export async function submitGroupOrder(draft: GroupOrderDraft, idempotencyKey: string) {
  const quantity = Math.trunc(draft.quantity);
  const name = draft.responsibleName.trim();
  const phone = draft.phoneNumber.replace(/\s+/g, "");
  const address = draft.address.trim();

  if (quantity < 5) {
    throw new Error("الحد الأدنى للطلب الجماعي هو 5 أشخاص.");
  }
  if (quantity > 100) {
    throw new Error("للطلبات التي تتجاوز 100 شخص، يرجى التواصل معنا عبر WhatsApp.");
  }
  if (draft.orderType === "كراء" && draft.productType !== "fullOutfit") {
    throw new Error("خيار الوشاح والقبعة فقط متاح للشراء وليس للكراء.");
  }
  if (name.length < 3 || name.length > 120) {
    throw new Error("أدخل اسم المسؤول عن الطلب.");
  }
  if (!phonePattern.test(phone)) {
    throw new Error("أدخل رقم هاتف مغربي صحيح.");
  }
  if (!draft.city.trim()) throw new Error("اختر المدينة.");
  if (draft.deliveryMethod === "homeDelivery" && address.length < 3) {
    throw new Error("أدخل عنوان التوصيل.");
  }
  if (!draft.deliveryDate) throw new Error("اختر موعد الطلب.");

  const scheduled = DateTime.fromISO(
    `${draft.deliveryDate}T${draft.deliveryTime}`,
    { zone: TZ },
  );
  if (!scheduled.isValid) throw new Error("موعد الطلب غير صالح.");
  if (scheduled < DateTime.now().setZone(TZ).plus({ hours: 24 })) {
    throw new Error("الطلب الجماعي يحتاج حجزًا قبل 24 ساعة على الأقل.");
  }

  const members = draft.members.map((x) => x.trim()).filter(Boolean);
  const membersExcelUrl = draft.orderType === "شراء" ? draft.membersExcelUrl?.trim() || null : null;
  const membersExcelName = draft.orderType === "شراء" ? draft.membersExcelName?.trim() || null : null;
  if (draft.orderType === "شراء") {
    if (membersExcelUrl) {
      if (!membersExcelUrl.startsWith("https://") || !membersExcelName) {
        throw new Error("ملف Excel المرفق غير صالح. أعد رفع الملف.");
      }
    } else if (members.length !== quantity) {
      throw new Error("أدخل اسمًا لكل فرد أو أرفق ملف Excel يحتوي على أسماء المجموعة.");
    }
    if (members.some((member) => member.length > 120)) {
      throw new Error("أحد أسماء الأفراد أطول من المسموح.");
    }
  }

  const normalizePrinting = (option: GroupPrintingOption): GroupPrintingOption => {
    if (!option.enabled) return disabledPrinting();
    const text = option.text.trim();
    const logoPath = option.logoPath?.trim() || null;
    if (!["text", "logo", "both"].includes(option.type)) {
      throw new Error("اختر نوع الطباعة لكل موضع تم تفعيله.");
    }
    if ((option.type === "text" || option.type === "both") && (!text || text.length > 500)) {
      throw new Error("أدخل نص الطباعة المطلوب بشكل صحيح.");
    }
    if ((option.type === "logo" || option.type === "both") && (!logoPath || !logoPath.startsWith("https://"))) {
      throw new Error("ارفع شعارًا صالحًا للطباعة.");
    }
    return {
      enabled: true,
      type: option.type,
      text: option.type === "logo" ? "" : text,
      logoPath: option.type === "text" ? null : logoPath,
    };
  };

  const isPurchase = draft.orderType === "شراء";
  const referenceImages = isPurchase ? draft.referenceImages : [];
  if (referenceImages.length > 8 || referenceImages.some((url) => !url.startsWith("https://"))) {
    throw new Error("يمكن رفع حتى 8 صور مرجعية صالحة.");
  }
  if (isPurchase) {
    normalizePrinting(draft.rightShawl);
    normalizePrinting(draft.leftShawl);
    normalizePrinting(draft.backShawl);
    normalizePrinting(draft.cap);
  }

  const response = await fetch("/api/group-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ draft }),
  });
  const payload = await response.json().catch(() => ({})) as {
    groupOrderNumber?: string;
    error?: string;
  };
  if (!response.ok || !payload.groupOrderNumber) {
    throw new Error(payload.error || "تعذر إرسال الطلب الجماعي.");
  }
  return payload.groupOrderNumber;
}
