"use client";

import {
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { DateTime } from "luxon";
import { db } from "@/lib/firebase";
import type {
  DeliveryCity,
  OrderRules,
  OrderType,
  ProductType,
  PublicProduct,
  ShopSettings,
} from "@/lib/order-types";

const TZ = "Africa/Casablanca";
const phonePattern = /^(05|06|07)[0-9]{8}$/;

export type PrintingOption = {
  enabled: boolean;
  type: "" | "text" | "logo" | "both";
  text: string;
  logoPath: string | null;
};

export type OrderDraft = {
  orderType: OrderType;
  productType: ProductType;
  gender: "" | "ذكر" | "أنثى";
  fabric: "ساتان" | "موبرة";
  shawlColor: string;
  fullName: string;
  phoneNumber: string;
  city: string;
  address: string;
  deliveryMethod: "homeDelivery" | "pickup";
  deliveryDate: string;
  deliveryTime: string;
  paymentMethod: "cash_at_store" | "bank_transfer" | "cash_transfer_agency";
  bankTransferPlan: "" | "deposit" | "full";
  paymentProvider: "" | "cash_plus" | "wafacash" | "western_union" | "other";
  notes: string;
  deliveryNotes: string;
  rightShawl: PrintingOption;
  leftShawl: PrintingOption;
  backShawl: PrintingOption;
  cap: PrintingOption;
  referenceImages: string[];
};

export type OrderQuote = {
  product: PublicProduct;
  productPrice: number;
  deliveryFee: number;
  total: number;
  deliveryDocumentId: string;
};

function productBasePrice(product: PublicProduct, order: OrderDraft) {
  if (order.orderType === "شراء") {
    return order.fabric === "ساتان" ? product.purchaseSatin : product.purchaseMoubara;
  }
  return order.fabric === "ساتان" ? product.rentalSatin : product.rentalMoubara;
}

export function quoteOrder(
  products: PublicProduct[],
  cities: DeliveryCity[],
  order: OrderDraft,
): OrderQuote {
  const product = products.find((x) => x.productType === order.productType);
  if (!product) throw new Error("المنتج المحدد غير متاح حاليًا.");

  let productPrice = productBasePrice(product, order);

  if (order.orderType === "شراء") {
    const hasShawlPrinting =
      order.rightShawl.enabled || order.leftShawl.enabled || order.backShawl.enabled;
    const hasCapPrinting =
      order.productType !== "shawlOnly" && order.cap.enabled;
    if (hasShawlPrinting) productPrice += 40;
    if (hasCapPrinting) productPrice += 40;
  }
  let deliveryFee = 0;
  let deliveryDocumentId = "";

  if (order.deliveryMethod === "homeDelivery") {
    if (order.city === "Fes") {
      deliveryFee = 20;
      deliveryDocumentId = "fes";
    } else {
      const city = cities.find((x) => x.name === order.city && x.active);
      if (!city) throw new Error("مدينة التوصيل المحددة غير متاحة حاليًا.");
      deliveryFee = city.price;
      deliveryDocumentId = city.id;
    }
  }

  return {
    product,
    productPrice,
    deliveryFee,
    total: productPrice + deliveryFee,
    deliveryDocumentId,
  };
}

function disabledPrinting(): PrintingOption {
  return { enabled: false, type: "", text: "", logoPath: null };
}

function normalizedPrinting(option: PrintingOption): PrintingOption {
  if (!option.enabled) return disabledPrinting();

  const text = option.text.trim();
  const logoPath = option.logoPath?.trim() || null;
  if (!["text", "logo", "both"].includes(option.type)) {
    throw new Error("اختر نوع الطباعة.");
  }
  if ((option.type === "text" || option.type === "both") && (!text || text.length > 500)) {
    throw new Error("أدخل نص الطباعة المطلوب بشكل صحيح.");
  }
  if ((option.type === "logo" || option.type === "both") &&
      (!logoPath || !logoPath.startsWith("https://"))) {
    throw new Error("ارفع شعارًا صالحًا للطباعة.");
  }
  return {
    enabled: true,
    type: option.type,
    text: option.type === "logo" ? "" : text,
    logoPath: option.type === "text" ? null : logoPath,
  };
}

function validateOrder(
  order: OrderDraft,
  shop: ShopSettings,
  rules: OrderRules,
  quote: OrderQuote,
) {
  const fullName = order.fullName.trim();
  const phone = order.phoneNumber.replace(/\s+/g, "");
  const address = order.address.trim();

  if (shop.maintenanceMode || !shop.acceptingOrders) {
    throw new Error("استقبال الطلبات متوقف مؤقتًا.");
  }
  if (order.orderType === "شراء" && !shop.purchaseEnabled) {
    throw new Error("طلبات الشراء متوقفة مؤقتًا.");
  }
  if (order.orderType === "كراء" && !shop.rentalEnabled) {
    throw new Error("طلبات الكراء متوقفة مؤقتًا.");
  }
  if (fullName.length < 3 || fullName.length > 120) {
    throw new Error("أدخل الاسم الكامل بشكل صحيح.");
  }
  if (!phonePattern.test(phone)) {
    throw new Error("أدخل رقم هاتف مغربي صحيح يبدأ بـ05 أو 06 أو 07.");
  }
  if (!order.shawlColor.trim() || order.shawlColor.trim().length > 80) {
    throw new Error("اختر لون الوشاح.");
  }
  if (order.deliveryMethod === "homeDelivery" && address.length < 3) {
    throw new Error("أدخل عنوان التوصيل.");
  }
  if (!/^(09|10|11|12|13|14|15|16|17|18|19|20|21):00$/.test(order.deliveryTime)) {
    throw new Error("اختر وقتًا صالحًا للموعد.");
  }
  if (!order.deliveryDate) throw new Error("اختر تاريخ الاستلام أو التوصيل.");

  const scheduled = DateTime.fromISO(
    `${order.deliveryDate}T${order.deliveryTime}`,
    { zone: TZ },
  );
  if (!scheduled.isValid) throw new Error("موعد الطلب غير صالح.");

  const now = DateTime.now().setZone(TZ);
  const minimum = order.orderType === "شراء"
    ? now.plus({ days: rules.purchasePreparationDays })
    : now.plus({ hours: rules.rentalAdvanceHours });

  if (scheduled < minimum) {
    const message = order.orderType === "شراء"
      ? `الشراء يحتاج على الأقل ${rules.purchasePreparationDays} يوم/أيام للتحضير.`
      : `الكراء يحتاج حجزًا مسبقًا بـ${rules.rentalAdvanceHours} ساعة على الأقل.`;
    throw new Error(message);
  }

  if (order.orderType === "كراء") {
    if (order.rightShawl.enabled || order.leftShawl.enabled || order.backShawl.enabled ||
        order.cap.enabled || order.referenceImages.length) {
      throw new Error("الطباعة والصور المرجعية متاحة للشراء فقط.");
    }
  } else {
    normalizedPrinting(order.rightShawl);
    normalizedPrinting(order.leftShawl);
    normalizedPrinting(order.backShawl);
    if (order.productType !== "shawlOnly") normalizedPrinting(order.cap);
    if (order.referenceImages.length > 4 ||
        order.referenceImages.some((url) => !url.startsWith("https://"))) {
      throw new Error("يمكن رفع حتى 4 صور مرجعية صالحة.");
    }
  }

  if (quote.total < 0) throw new Error("تعذر احتساب السعر.");

  if (order.paymentMethod === "cash_at_store") {
    if (!shop.cashAtStoreEnabled || order.deliveryMethod !== "pickup" || order.city !== "Fes") {
      throw new Error("الدفع نقدًا عند المحل غير متاح لهذا الطلب.");
    }
  } else if (order.paymentMethod === "bank_transfer") {
    if (!shop.bankTransferEnabled) throw new Error("التحويل البنكي غير متاح حاليًا.");
  } else if (order.paymentMethod === "cash_transfer_agency") {
    if (!shop.cashTransferAgencyEnabled) throw new Error("التحويل عبر وكالة غير متاح حاليًا.");
    if (!["cash_plus", "wafacash", "western_union", "other"].includes(order.paymentProvider)) {
      throw new Error("اختر وكالة التحويل.");
    }
  }

  if (order.paymentMethod !== "cash_at_store") {
    if (order.bankTransferPlan === "deposit" && !shop.depositPaymentEnabled) {
      throw new Error("خيار التسبيق غير متاح حاليًا.");
    }
    if (order.bankTransferPlan === "full" && !shop.fullPaymentEnabled) {
      throw new Error("خيار الدفع الكامل غير متاح حاليًا.");
    }
    if (!["deposit", "full"].includes(order.bankTransferPlan)) {
      throw new Error("اختر طريقة إتمام الدفع.");
    }
  }

  return { fullName, phone, address, scheduled };
}

export async function submitOrder(args: {
  draft: OrderDraft;
  products: PublicProduct[];
  cities: DeliveryCity[];
  shop: ShopSettings;
  rules: OrderRules;
}) {
  const { draft, products, cities, shop, rules } = args;
  const quote = quoteOrder(products, cities, draft);
  const normalized = validateOrder(draft, shop, rules, quote);
  const scheduled = normalized.scheduled;
  const isProofPayment = draft.paymentMethod !== "cash_at_store";
  const year = DateTime.now().setZone(TZ).year;

  const counterRef = doc(db, "order_number_counters", String(year));
  const phoneLookupRef = doc(db, "tracking_phone_lookup", normalized.phone);

  const orderNumber = await runTransaction(db, async (transaction) => {
    const [counterSnap, phoneLookupSnap] = await Promise.all([
      transaction.get(counterRef),
      transaction.get(phoneLookupRef),
    ]);

    const initial = year === 2026 ? 17 : 0;
    const stored = counterSnap.exists()
      ? Number(counterSnap.data().lastNumber ?? initial)
      : initial;
    const next = stored + 1;
    const number = `GM-${year}-${String(next).padStart(6, "0")}`;

    const orderRef = doc(db, "orders", number);
    const trackingRef = doc(db, "order_tracking", number);

    const returnAt = scheduled.plus({ hours: 24 });
    const returnDate = draft.orderType === "كراء"
      ? returnAt.setZone(TZ).toFormat("yyyy-MM-dd")
      : null;
    const returnTime = draft.orderType === "كراء"
      ? returnAt.setZone(TZ).toFormat("HH:mm")
      : "";

    const deadlineHours = Math.max(1, Math.min(720, shop.paymentDeadlineHours));
    const depositPercentage = Math.max(1, Math.min(100, shop.depositPercentage));
    const depositAmount = draft.bankTransferPlan === "deposit" && isProofPayment
      ? quote.total * depositPercentage / 100
      : null;

    const rightShawl = draft.orderType === "شراء" ? normalizedPrinting(draft.rightShawl) : disabledPrinting();
    const leftShawl = draft.orderType === "شراء" ? normalizedPrinting(draft.leftShawl) : disabledPrinting();
    const backShawl = draft.orderType === "شراء" ? normalizedPrinting(draft.backShawl) : disabledPrinting();
    const cap = draft.orderType === "شراء" && draft.productType !== "shawlOnly"
      ? normalizedPrinting(draft.cap)
      : disabledPrinting();

    const orderData: Record<string, unknown> = {
      orderNumber: number,
      status: "received",
      paymentStatus: "pending",
      paymentMethod: draft.paymentMethod,
      bankTransferPlan: isProofPayment ? draft.bankTransferPlan : "",
      paymentProvider:
        draft.paymentMethod === "cash_transfer_agency" ? draft.paymentProvider : "",
      paymentDeadline: null,
      totalPrice: quote.total,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      gender: draft.productType === "shawlOnly" ? "" : draft.gender,
      orderType: draft.orderType,
      productType: draft.productType,
      catalogProductId: quote.product.id,
      catalogProductNameAr: quote.product.nameAr,
      catalogProductNameEn: quote.product.nameEn ?? "",
      fabric: draft.fabric,
      shawlColor: draft.shawlColor.trim(),
      notes: draft.notes.trim(),
      deliveryMethod: draft.deliveryMethod,
      fullName: normalized.fullName,
      phoneNumber: normalized.phone,
      city: draft.city,
      address: draft.deliveryMethod === "pickup" ? "" : normalized.address,
      deliveryNotes: draft.deliveryNotes.trim(),
      deliveryDate: draft.deliveryDate,
      deliveryTime: draft.deliveryTime,
      returnDate,
      returnTime,
      urgentOrder: false,
      deliveryFee: quote.deliveryFee,
      fesArea: null,
      rightShawl,
      leftShawl,
      backShawl,
      cap,
      referenceImages: draft.orderType === "شراء" ? draft.referenceImages : [],
      productPriceApplied: quote.productPrice,
      deliveryFeeApplied: quote.deliveryFee,
      deliveryPricingDocumentId: quote.deliveryDocumentId,
      amountPaid: 0,
      remainingAmount: quote.total,
      trackingPhoneKey: normalized.phone,
      scheduledAt: Timestamp.fromDate(scheduled.toUTC().toJSDate()),
      purchasePreparationDaysApplied: rules.purchasePreparationDays,
      rentalAdvanceHoursApplied: rules.rentalAdvanceHours,
      scheduleTimeZone: TZ,
    };

    if (draft.orderType === "كراء") {
      orderData.returnAt = Timestamp.fromDate(returnAt.toUTC().toJSDate());
    }

    if (isProofPayment) {
      orderData.paymentDeadlineHoursApplied = deadlineHours;
      orderData.paymentDeadlineTimeZone = TZ;
      if (draft.bankTransferPlan === "deposit") {
        orderData.depositPercentageApplied = depositPercentage;
        orderData.depositRequiredAmount = depositAmount;
      }
    }

    transaction.set(counterRef, {
      lastNumber: next,
      reconciledWithSavedOrders: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    transaction.set(orderRef, orderData);
    transaction.set(trackingRef, {
      orderNumber: number,
      status: "received",
      orderType: draft.orderType,
      productType: draft.productType,
      createdAt: serverTimestamp(),
      ...(isProofPayment ? { paymentDeadlineHoursApplied: deadlineHours } : {}),
      updatedAt: serverTimestamp(),
    });

    const existing = phoneLookupSnap.exists() ? phoneLookupSnap.data() : {};
    const previous = new Set<string>();
    const raw = existing.orderNumbers;
    if (Array.isArray(raw)) {
      raw.forEach((x) => {
        const value = String(x ?? "");
        if (/^GM-[0-9]{4}-[0-9]{6}$/.test(value)) previous.add(value);
      });
    } else if (typeof existing.orderNumber === "string") {
      previous.add(existing.orderNumber);
    }
    previous.add(number);

    transaction.set(phoneLookupRef, {
      orderNumber: number,
      latestOrderNumber: number,
      orderNumbers: [...previous],
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return number;
  }, { maxAttempts: 10 });

  return { orderNumber, quote };
}
