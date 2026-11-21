"use client";

import { doc, runTransaction, serverTimestamp, Timestamp } from "firebase/firestore";
import { DateTime } from "luxon";
import { db } from "@/lib/firebase";
import { loadDeliveryCities, loadOrderRules, loadProducts, loadShopSettings } from "@/lib/public-data";

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

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((value) => chars[value % chars.length])
    .join("");
  const year = DateTime.now().setZone(TZ).year;
  return `GRP-${year}-${random}`;
}

export async function submitGroupOrder(draft: GroupOrderDraft) {
  const quantity = Math.trunc(draft.quantity);
  const name = draft.responsibleName.trim();
  const phone = draft.phoneNumber.replace(/\s+/g, "");
  const address = draft.address.trim();
  const notes = draft.notes.trim();
  const [shop, rules, products, cities] = await Promise.all([
    loadShopSettings(), loadOrderRules(), loadProducts(), loadDeliveryCities(),
  ]);

  if (shop.maintenanceMode || !shop.acceptingOrders) throw new Error("استقبال الطلبات متوقف مؤقتًا.");
  if (draft.orderType === "شراء" && !shop.purchaseEnabled) throw new Error("طلبات الشراء متوقفة مؤقتًا.");
  if (draft.orderType === "كراء" && !shop.rentalEnabled) throw new Error("طلبات الكراء متوقفة مؤقتًا.");

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
  if (draft.fabric !== "ساتان" && draft.fabric !== "موبرة") throw new Error("اختر نوع القماش.");
  const shawlColor = draft.shawlColor.trim();
  if (!shawlColor || shawlColor.length > 80) throw new Error("أدخل لون الوشاح بشكل صحيح.");
  if (draft.deliveryMethod === "homeDelivery" && address.length < 3) {
    throw new Error("أدخل عنوان التوصيل.");
  }
  if (!draft.deliveryDate) throw new Error("اختر موعد الطلب.");

  const scheduled = DateTime.fromISO(
    `${draft.deliveryDate}T${draft.deliveryTime}`,
    { zone: TZ },
  );
  if (!scheduled.isValid) throw new Error("موعد الطلب غير صالح.");
  const minimum = draft.orderType === "شراء"
    ? DateTime.now().setZone(TZ).plus({ days: rules.purchasePreparationDays })
    : DateTime.now().setZone(TZ).plus({ hours: rules.rentalAdvanceHours });
  if (scheduled < minimum) {
    throw new Error(draft.orderType === "شراء"
      ? `الشراء الجماعي يحتاج ${rules.purchasePreparationDays} يوم/أيام على الأقل للتحضير.`
      : `الكراء الجماعي يحتاج حجزًا مسبقًا بـ${rules.rentalAdvanceHours} ساعة على الأقل.`);
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

  const product = products.find((item) => item.productType === (draft.orderType === "كراء" ? "fullOutfit" : draft.productType));
  if (!product) throw new Error("المنتج المحدد غير متاح حاليًا.");
  const baseUnitPrice = draft.orderType === "شراء"
    ? (draft.fabric === "ساتان" ? product.purchaseSatin : product.purchaseMoubara)
    : (draft.fabric === "ساتان" ? product.rentalSatin : product.rentalMoubara);
  const hasShawlPrinting = draft.rightShawl.enabled || draft.leftShawl.enabled || draft.backShawl.enabled;
  const hasCapPrinting = draft.productType !== "shawlOnly" && draft.cap.enabled;
  const printingUnitPrice = draft.orderType === "شراء"
    ? (hasShawlPrinting ? 40 : 0) + (hasCapPrinting ? 40 : 0)
    : 0;
  const unitPriceApplied = baseUnitPrice + printingUnitPrice;
  const deliveryCity = cities.find((item) => item.name === draft.city && item.active);
  if (draft.deliveryMethod === "homeDelivery" && !deliveryCity) throw new Error("مدينة التوصيل المحددة غير متاحة حاليًا.");
  const deliveryFeeApplied = draft.deliveryMethod === "pickup" ? 0 : (deliveryCity?.price ?? 0);
  const deliveryPricingDocumentId = draft.deliveryMethod === "pickup" ? "" : (deliveryCity?.id ?? "");
  const productTotalEstimate = unitPriceApplied * quantity;
  const totalPriceEstimate = productTotalEstimate + deliveryFeeApplied;

  const number = makeCode();
  const returnAt = draft.orderType === "كراء" ? scheduled.plus({ hours: 24 }) : null;

  const disabledPrinting = (): GroupPrintingOption => ({
    enabled: false, type: "", text: "", logoPath: null,
  });
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
  const rightShawl = isPurchase ? normalizePrinting(draft.rightShawl) : disabledPrinting();
  const leftShawl = isPurchase ? normalizePrinting(draft.leftShawl) : disabledPrinting();
  const backShawl = isPurchase ? normalizePrinting(draft.backShawl) : disabledPrinting();
  const cap = isPurchase ? normalizePrinting(draft.cap) : disabledPrinting();

  const groupOrderRef = doc(db, "group_orders", number);
  const trackingRef = doc(db, "order_tracking", number);
  const phoneLookupRef = doc(db, "tracking_phone_lookup", phone);

  await runTransaction(db, async (transaction) => {
    const lookupSnap = await transaction.get(phoneLookupRef);
    const existing = lookupSnap.exists() ? lookupSnap.data() : {};
    const previous = new Set<string>();
    const isTrackingNumber = (value: string) => /^GM-[0-9]{4}-[0-9]{6}$/.test(value) || /^GRP-[0-9]{4}-[A-HJ-NP-Z2-9]{8}$/.test(value);
    if (Array.isArray(existing.orderNumbers)) {
      existing.orderNumbers.forEach((item: unknown) => {
        const value = String(item ?? "");
        if (isTrackingNumber(value)) previous.add(value);
      });
    } else if (typeof existing.orderNumber === "string" && isTrackingNumber(existing.orderNumber)) {
      previous.add(existing.orderNumber);
    }
    previous.add(number);

    transaction.set(groupOrderRef, {
    groupOrderNumber: number,
    orderType: draft.orderType,
    quantity,
    responsibleName: name,
    phoneNumber: phone,
    city: draft.city.trim(),
    deliveryMethod: draft.deliveryMethod,
    address: draft.deliveryMethod === "pickup" ? "" : address,
    scheduledAt: Timestamp.fromDate(scheduled.toUTC().toJSDate()),
    returnAt: returnAt ? Timestamp.fromDate(returnAt.toUTC().toJSDate()) : null,
    members: draft.orderType === "شراء" && !membersExcelUrl ? members : [],
    membersExcelUrl,
    membersExcelName,
    productType: isPurchase ? draft.productType : "fullOutfit",
    catalogProductId: product.id,
    fabric: draft.fabric,
    shawlColor,
    rightShawl,
    leftShawl,
    backShawl,
    cap,
    referenceImages,
    customizationScope: "shared_group_design",
    notes,
    unitPriceApplied,
    productTotalEstimate,
    deliveryFeeApplied,
    deliveryPricingDocumentId,
    totalPriceEstimate,
    priceEstimateCurrency: "MAD",
    priceEstimateBasis: "current_catalog_prices_no_group_discount",
    purchasePreparationDaysApplied: rules.purchasePreparationDays,
    rentalAdvanceHoursApplied: rules.rentalAdvanceHours,
    status: "received",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    });

    transaction.set(trackingRef, {
      orderNumber: number,
      status: "received",
      orderType: draft.orderType,
      productType: isPurchase ? draft.productType : "fullOutfit",
      quantity,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(phoneLookupRef, {
      orderNumber: number,
      latestOrderNumber: number,
      orderNumbers: [...previous],
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  return number;
}
