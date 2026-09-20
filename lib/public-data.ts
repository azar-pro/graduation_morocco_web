"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  DeliveryCity,
  OrderRules,
  PublicProduct,
  ShopSettings,
} from "@/lib/order-types";

export const DEFAULT_SHOP: ShopSettings = {
  acceptingOrders: true,
  purchaseEnabled: true,
  rentalEnabled: true,
  maintenanceMode: false,
  cashAtStoreEnabled: true,
  bankTransferEnabled: true,
  cashTransferAgencyEnabled: true,
  depositPaymentEnabled: true,
  fullPaymentEnabled: true,
  paymentDeadlineHours: 48,
  depositPercentage: 50,
};

export const DEFAULT_RULES: OrderRules = {
  purchasePreparationDays: 2,
  rentalAdvanceHours: 24,
  urgentOrdersEnabled: false,
  urgentMinimumHours: 12,
};

export const DEFAULT_CITIES: DeliveryCity[] = [
  { id: "fes", name: "Fes", price: 20, active: true },
  { id: "city_meknes", name: "Meknes", price: 50, active: true },
  { id: "city_sefrou", name: "Sefrou", price: 50, active: true },
  { id: "city_ifrane", name: "Ifrane", price: 50, active: true },
  { id: "city_el_hajeb", name: "El Hajeb", price: 50, active: true },
  { id: "city_taza", name: "Taza", price: 50, active: true },
  { id: "city_rabat", name: "Rabat", price: 60, active: true },
  { id: "city_casablanca", name: "Casablanca", price: 60, active: true },
  { id: "city_marrakech", name: "Marrakech", price: 60, active: true },
  { id: "city_tangier", name: "Tangier", price: 60, active: true },
  { id: "city_agadir", name: "Agadir", price: 60, active: true },
  { id: "city_oujda", name: "Oujda", price: 60, active: true },
  { id: "city_tetouan", name: "Tetouan", price: 60, active: true },
  { id: "city_nador", name: "Nador", price: 60, active: true },
];

const bool = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;
const integer = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : fallback;

export async function loadShopSettings(): Promise<ShopSettings> {
  const snap = await getDoc(doc(db, "settings", "shop"));
  if (!snap.exists()) return DEFAULT_SHOP;
  const d = snap.data();
  return {
    acceptingOrders: bool(d.acceptingOrders, true),
    purchaseEnabled: bool(d.purchaseEnabled, true),
    rentalEnabled: bool(d.rentalEnabled, true),
    maintenanceMode: bool(d.maintenanceMode, false),
    cashAtStoreEnabled: bool(d.cashAtStoreEnabled, true),
    bankTransferEnabled: bool(d.bankTransferEnabled, true),
    cashTransferAgencyEnabled: bool(d.cashTransferAgencyEnabled, true),
    depositPaymentEnabled: bool(d.depositPaymentEnabled, true),
    fullPaymentEnabled: bool(d.fullPaymentEnabled, true),
    paymentDeadlineHours: integer(d.paymentDeadlineHours, 48),
    depositPercentage: integer(d.depositPercentage, 50),
  };
}

export async function loadOrderRules(): Promise<OrderRules> {
  const snap = await getDoc(doc(db, "settings", "order_rules"));
  if (!snap.exists()) return DEFAULT_RULES;
  const d = snap.data();
  return {
    purchasePreparationDays: integer(d.purchasePreparationDays, 2),
    rentalAdvanceHours: integer(d.rentalAdvanceHours, 24),
    urgentOrdersEnabled: bool(d.urgentOrdersEnabled, false),
    urgentMinimumHours: integer(d.urgentMinimumHours, 12),
  };
}

export async function loadProducts(): Promise<PublicProduct[]> {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs
    .map((x) => ({ id: x.id, ...x.data() } as Record<string, unknown>))
    .filter((x) => x.active !== false)
    .filter((x) => ["fullOutfit", "shawlAndCap", "shawlOnly"].includes(String(x.productType)))
    .map((x) => ({
      id: String(x.id),
      productType: String(x.productType) as PublicProduct["productType"],
      nameAr: String(x.nameAr ?? x.name ?? "منتج تخرج"),
      nameEn: String(x.nameEn ?? ""),
      active: x.active !== false,
      purchaseSatin: integer(x.purchaseSatin, 0),
      purchaseMoubara: integer(x.purchaseMoubara, 0),
      rentalSatin: integer(x.rentalSatin, 0),
      rentalMoubara: integer(x.rentalMoubara, 0),
    }));
}

export async function loadDeliveryCities(): Promise<DeliveryCity[]> {
  try {
    const snap = await getDocs(collection(db, "delivery_settings"));
    const dynamic = snap.docs
      .map((x) => ({ id: x.id, ...x.data() } as Record<string, unknown>))
      .filter((x) => x.type === "city" && x.active !== false)
      .map((x) => ({
        id: String(x.id),
        name: String(x.name ?? "").trim(),
        price: integer(x.price, 60),
        active: true,
      }))
      .filter((x) => x.name && x.name !== "Fes");

    const byName = new Map(DEFAULT_CITIES.map((x) => [x.name, x]));
    for (const city of dynamic) byName.set(city.name, city);
    return [...byName.values()];
  } catch {
    return DEFAULT_CITIES;
  }
}
