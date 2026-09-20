"use client";

import { doc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { DateTime } from "luxon";
import { db } from "@/lib/firebase";

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

  if (quantity < 5 || quantity > 100) {
    throw new Error("عدد أفراد الطلب الجماعي يجب أن يكون بين 5 و100.");
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
  if (draft.orderType === "شراء") {
    if (members.length !== quantity) {
      throw new Error("في طلب الشراء يجب إدخال اسم لكل فرد في المجموعة.");
    }
    if (members.some((member) => member.length > 120)) {
      throw new Error("أحد أسماء الأفراد أطول من المسموح.");
    }
  }

  const number = makeCode();
  const returnAt = draft.orderType === "كراء" ? scheduled.plus({ hours: 24 }) : null;

  await setDoc(doc(db, "group_orders", number), {
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
    members: draft.orderType === "شراء" ? members : [],
    notes,
    status: "received",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return number;
}
