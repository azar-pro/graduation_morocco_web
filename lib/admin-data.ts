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


export async function loadAdminOrder(orderNumber: string): Promise<AdminOrder | null> {
  const snap = await getDoc(doc(db, "orders", orderNumber));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as AdminOrder) : null;
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
