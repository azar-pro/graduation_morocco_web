import type { Metadata } from "next";
import AdminOrderDetailClient from "./AdminOrderDetailClient";

export const metadata: Metadata = {
  title: "تفاصيل الطلب",
  robots: { index: false, follow: false },
};

export default function AdminOrderDetailPage() {
  return <AdminOrderDetailClient />;
}
