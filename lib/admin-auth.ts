"use client";

import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type AdminProfile = {
  uid: string;
  fullName: string;
  email: string;
};

export async function signInAdmin(email: string, password: string): Promise<AdminProfile> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const user = credential.user;
  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.data();
  const allowed = snap.exists() && data?.role === "admin" && data?.active === true;

  if (!allowed) {
    await signOut(auth);
    throw new Error("هذا الحساب غير مصرح له بالدخول إلى لوحة الإدارة.");
  }

  return {
    uid: user.uid,
    fullName: String(data?.fullName ?? ""),
    email: user.email ?? String(data?.email ?? ""),
  };
}

export async function loadAdminProfile(user: User): Promise<AdminProfile | null> {
  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.data();
  if (!snap.exists() || data?.role !== "admin" || data?.active !== true) return null;
  return {
    uid: user.uid,
    fullName: String(data?.fullName ?? ""),
    email: user.email ?? String(data?.email ?? ""),
  };
}

export function watchAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signOutAdmin() {
  await signOut(auth);
}
