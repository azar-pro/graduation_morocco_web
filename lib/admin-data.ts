"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  setDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type AdminOrder = Record<string, unknown> & {
  id: string;
  orderNumber?: string;
  status?: string;
  fullName?: string;
  phoneNumber?: string;
  orderType?: string;
  totalPrice?: number;
};

export type AdminGroupOrder = Record<string, unknown> & {
  id: string;
  groupOrderNumber?: string;
  status?: string;
  responsibleName?: string;
  phoneNumber?: string;
  orderType?: string;
  quantity?: number;
};

export async function loadAdminOrders(max = 100): Promise<AdminOrder[]> {
  const snap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(max)));
  return snap.docs.map((x) => ({ id: x.id, ...x.data() }));
}

export async function loadAdminGroupOrders(max = 100): Promise<AdminGroupOrder[]> {
  const snap = await getDocs(query(collection(db, "group_orders"), orderBy("createdAt", "desc"), limit(max)));
  return snap.docs.map((x) => ({ id: x.id, ...x.data() }));
}

export async function updateOrderStatus(orderNumber: string, status: string) {
  await updateDoc(doc(db, "orders", orderNumber), { status, updatedAt: serverTimestamp() });
  await updateDoc(doc(db, "order_tracking", orderNumber), { status, updatedAt: serverTimestamp() });
}

export async function updateGroupOrderStatus(groupOrderNumber: string, status: string) {
  await updateDoc(doc(db, "group_orders", groupOrderNumber), { status, updatedAt: serverTimestamp() });
}


export async function confirmGroupRentalDepositReceived(groupOrderNumber: string) {
  const ref = doc(db, "group_orders", groupOrderNumber);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("الطلب الجماعي غير موجود.");
    const order = snap.data();
    if (order.orderType !== "كراء") throw new Error("هذا الطلب ليس طلب كراء.");
    if (order.rentalDepositStatus === "collected") throw new Error("تم تسجيل استلام الضمان مسبقًا.");
    const deposit = Number(order.rentalSecurityDepositAmount ?? 0);
    const deliveryFee = Number(order.deliveryFeeApplied ?? 0);
    if (!Number.isSafeInteger(deposit) || deposit <= 0) throw new Error("قيمة ضمان الكراء غير صالحة.");
    if (!Number.isSafeInteger(deliveryFee) || deliveryFee < 0) throw new Error("قيمة التوصيل غير صالحة.");
    transaction.update(ref, {
      rentalDepositCollectedAmount: deposit,
      rentalDepositStatus: "collected",
      rentalDepositCollectedAt: serverTimestamp(),
      rentalDeliveryFeeCollectedAmount: deliveryFee,
      rentalAmountCollectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function settleGroupRentalReturn(args: { groupOrderNumber: string; damageDeduction: number }) {
  const damage = Number(args.damageDeduction);
  if (!Number.isSafeInteger(damage) || damage < 0) throw new Error("قيمة خصم الضرر يجب أن تكون عددًا صحيحًا موجبًا أو صفرًا.");
  const ref = doc(db, "group_orders", args.groupOrderNumber);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("الطلب الجماعي غير موجود.");
    const order = snap.data();
    if (order.orderType !== "كراء") throw new Error("هذا الطلب ليس طلب كراء.");
    if (order.rentalDepositStatus !== "collected") throw new Error("سجّل استلام الضمان أولًا.");
    if (order.rentalReturnStatus === "returned") throw new Error("تمت تسوية إرجاع هذه المجموعة مسبقًا.");
    const deposit = Number(order.rentalDepositCollectedAmount ?? order.rentalSecurityDepositAmount ?? 0);
    const rentalFee = Number(order.rentalFeeAmount ?? order.productTotalEstimate ?? 0);
    if (!Number.isSafeInteger(deposit) || deposit < 0 || !Number.isSafeInteger(rentalFee) || rentalFee < 0) {
      throw new Error("بيانات مبالغ الكراء غير صالحة؛ راجع الطلب قبل التسوية.");
    }
    const refund = Math.max(0, deposit - rentalFee - damage);
    const additionalDue = Math.max(0, rentalFee + damage - deposit);
    transaction.update(ref, {
      rentalReturnStatus: "returned",
      rentalReturnedAt: serverTimestamp(),
      rentalDamageDeduction: damage,
      rentalRefundAmount: refund,
      rentalAdditionalDamageDue: additionalDue,
      rentalSettlementStatus: "settled",
      updatedAt: serverTimestamp(),
    });
    return { deposit, rentalFee, damage, refund, additionalDue };
  });
}

export async function loadAdminOrder(orderNumber: string): Promise<AdminOrder | null> {
  const snap = await getDoc(doc(db, "orders", orderNumber));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as AdminOrder) : null;
}

export async function confirmRentalDepositReceived(orderNumber: string) {
  const ref = doc(db, "orders", orderNumber);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("الطلب غير موجود.");
    const order = snap.data();
    if (order.orderType !== "كراء") throw new Error("هذا الطلب ليس طلب كراء.");
    if (order.rentalDepositStatus === "collected") throw new Error("تم تسجيل استلام الضمان مسبقًا.");
    const deposit = Number(order.rentalSecurityDepositAmount ?? 0);
    const deliveryFee = Number(order.deliveryFeeApplied ?? order.deliveryFee ?? 0);
    if (!Number.isSafeInteger(deposit) || deposit <= 0) throw new Error("قيمة ضمان الكراء غير صالحة.");
    if (!Number.isSafeInteger(deliveryFee) || deliveryFee < 0) throw new Error("قيمة التوصيل غير صالحة.");
    transaction.update(ref, {
      rentalDepositCollectedAmount: deposit,
      rentalDepositStatus: "collected",
      rentalDepositCollectedAt: serverTimestamp(),
      rentalDeliveryFeeCollectedAmount: deliveryFee,
      rentalAmountCollectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function settleRentalReturn(args: { orderNumber: string; damageDeduction: number }) {
  const damage = Number(args.damageDeduction);
  if (!Number.isSafeInteger(damage) || damage < 0) throw new Error("قيمة خصم الضرر يجب أن تكون عددًا صحيحًا موجبًا أو صفرًا.");
  const ref = doc(db, "orders", args.orderNumber);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("الطلب غير موجود.");
    const order = snap.data();
    if (order.orderType !== "كراء") throw new Error("هذا الطلب ليس طلب كراء.");
    if (order.rentalDepositStatus !== "collected") throw new Error("سجّل استلام الضمان أولًا.");
    if (order.rentalReturnStatus === "returned") throw new Error("تمت تسوية إرجاع هذه البدلة مسبقًا.");

    const deposit = Number(order.rentalDepositCollectedAmount ?? order.rentalSecurityDepositAmount ?? 0);
    const rentalFee = Number(order.rentalFeeAmount ?? 0);
    const totalPrice = Number(order.totalPrice ?? 0);
    if (!Number.isSafeInteger(deposit) || deposit < 0
      || !Number.isSafeInteger(rentalFee) || rentalFee < 0
      || !Number.isSafeInteger(totalPrice) || totalPrice < 0) {
      throw new Error("بيانات مبالغ الكراء غير صالحة؛ راجع الطلب قبل التسوية.");
    }
    const deductions = rentalFee + damage;
    const refund = Math.max(0, deposit - deductions);
    const additionalDue = Math.max(0, deductions - deposit);

    transaction.update(ref, {
      rentalReturnStatus: "returned",
      rentalReturnedAt: serverTimestamp(),
      rentalDamageDeduction: damage,
      rentalRefundAmount: refund,
      rentalAdditionalDamageDue: additionalDue,
      rentalSettlementStatus: "settled",
      paymentStatus: "paid",
      amountPaid: totalPrice,
      remainingAmount: 0,
      paymentUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { deposit, rentalFee, damage, refund, additionalDue };
  });
}

export async function updateOrderPayment(args: {
  orderNumber: string;
  paymentMethod: string;
  paymentStatus: "pending" | "partial" | "paid";
  amountPaid: number;
  totalPrice: number;
}) {
  const safeTotal = Math.max(0, Number(args.totalPrice) || 0);
  const safePaid = Math.min(safeTotal, Math.max(0, Number(args.amountPaid) || 0));
  const remainingAmount = Math.max(0, safeTotal - safePaid);

  await updateDoc(doc(db, "orders", args.orderNumber), {
    paymentMethod: args.paymentMethod,
    paymentStatus: args.paymentStatus,
    amountPaid: safePaid,
    remainingAmount,
    paymentUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}


export type AdminProduct = Record<string, unknown> & {
  id: string;
  nameAr?: string;
  nameEn?: string;
  productType?: string;
  active?: boolean;
  purchaseSatin?: number;
  purchaseMoubara?: number;
  rentalSatin?: number;
  rentalMoubara?: number;
};

export async function loadAdminProducts(): Promise<AdminProduct[]> {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map((x) => ({ id: x.id, ...x.data() }));
}

export async function saveAdminProduct(product: AdminProduct) {
  const ref = doc(db, "products", product.id);
  await updateDoc(ref, {
    nameAr: String(product.nameAr ?? ""),
    nameEn: String(product.nameEn ?? ""),
    active: product.active !== false,
    purchaseSatin: Math.max(0, Number(product.purchaseSatin ?? 0)),
    purchaseMoubara: Math.max(0, Number(product.purchaseMoubara ?? 0)),
    rentalSatin: Math.max(0, Number(product.rentalSatin ?? 0)),
    rentalMoubara: Math.max(0, Number(product.rentalMoubara ?? 0)),
    updatedAt: serverTimestamp(),
  });
}

export type AdminDeliveryCity = {
  id: string;
  name: string;
  type?: string;
  price: number;
  active: boolean;
};

export async function loadAdminDelivery(): Promise<AdminDeliveryCity[]> {
  const snap = await getDocs(collection(db, "delivery_settings"));
  return snap.docs.map((x) => ({
    id: x.id,
    name: String(x.data().name ?? (x.id === "fes" ? "Fes" : "")),
    type: String(x.data().type ?? ""),
    price: Number(x.data().price ?? (x.id === "fes" ? 20 : 60)),
    active: x.data().active !== false,
  }));
}

export async function saveAdminDeliveryCity(city: AdminDeliveryCity) {
  await updateDoc(doc(db, "delivery_settings", city.id), {
    name: city.name,
    price: Math.max(0, Math.round(city.price)),
    active: city.active,
    updatedAt: serverTimestamp(),
  });
}

export async function loadShopAdminSettings() {
  const snap = await getDoc(doc(db, "settings", "shop"));
  return snap.exists() ? snap.data() : {};
}

export async function saveShopAdminSettings(data: Record<string, unknown>) {
  await setDoc(doc(db, "settings", "shop"), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}


export async function loadAdminGroupOrder(groupOrderNumber: string): Promise<AdminGroupOrder | null> {
  const snap = await getDoc(doc(db, "group_orders", groupOrderNumber));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as AdminGroupOrder) : null;
}
