"use client";

import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const orderPattern = /^(GM-[0-9]{4}-[0-9]{6}|GRP-[0-9]{4}-[A-HJ-NP-Z2-9]{8})$/;

export type TrackingResult = {
  orderNumber: string;
  status: string;
  orderType: string;
  productType: string;
  createdAt?: Date;
};

async function readTracking(orderNumber: string): Promise<TrackingResult | null> {
  const snap = await getDoc(doc(db, "order_tracking", orderNumber));
  if (!snap.exists()) return null;
  const data = snap.data();
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined;
  return {
    orderNumber: String(data.orderNumber ?? orderNumber),
    status: String(data.status ?? "received"),
    orderType: String(data.orderType ?? ""),
    productType: String(data.productType ?? ""),
    createdAt,
  };
}

export async function trackPublicOrder(search: string): Promise<TrackingResult[]> {
  const orderNumber = search.trim().toUpperCase();
  if (!orderPattern.test(orderNumber)) return [];
  const result = await readTracking(orderNumber);
  return result ? [result] : [];
}
