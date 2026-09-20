"use client";

import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const orderPattern = /^GM-[0-9]{4}-[0-9]{6}$/;
const phonePattern = /^(05|06|07)[0-9]{8}$/;

export type TrackingResult = {
  orderNumber: string;
  status: string;
  orderType: string;
  productType: string;
  createdAt?: Date;
};

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function readOrderNumbers(data: Record<string, unknown> | undefined): string[] {
  if (!data) return [];
  const values = new Set<string>();
  if (Array.isArray(data.orderNumbers)) {
    for (const item of data.orderNumbers) {
      const value = String(item ?? "").trim();
      if (orderPattern.test(value)) values.add(value);
    }
  }
  for (const key of ["latestOrderNumber", "orderNumber"]) {
    const value = String(data[key] ?? "").trim();
    if (orderPattern.test(value)) values.add(value);
  }
  return [...values];
}

async function readTracking(orderNumber: string): Promise<TrackingResult | null> {
  const snap = await getDoc(doc(db, "order_tracking", orderNumber));
  if (!snap.exists()) return null;
  const d = snap.data();
  const createdAt = d.createdAt instanceof Timestamp ? d.createdAt.toDate() : undefined;
  return {
    orderNumber: String(d.orderNumber ?? orderNumber),
    status: String(d.status ?? "received"),
    orderType: String(d.orderType ?? ""),
    productType: String(d.productType ?? ""),
    createdAt,
  };
}

export async function trackPublicOrder(search: string): Promise<TrackingResult[]> {
  const value = search.trim().toUpperCase();
  if (orderPattern.test(value)) {
    const direct = await readTracking(value);
    return direct ? [direct] : [];
  }

  const phone = normalizePhone(search);
  if (!phonePattern.test(phone)) return [];

  const lookup = await getDoc(doc(db, "tracking_phone_lookup", phone));
  if (!lookup.exists()) return [];

  const numbers = readOrderNumbers(lookup.data());
  const results = (await Promise.all(numbers.map(readTracking))).filter(
    (x): x is TrackingResult => Boolean(x),
  );

  return results.sort(
    (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
  );
}
