import type { Metadata } from "next";
import TrackingClient from "./TrackingClient";
import SiteHeader from "@/components/SiteHeader";
import TrackOrderPageClient from "./TrackOrderPageClient";

export const metadata: Metadata = {
  title: "تتبع الطلب",
  description: "تتبع حالة طلبك لدى Morocco Graduation باستخدام رقم الطلب أو رقم الهاتف.",
  robots: { index: false, follow: false },
};

export default function TrackOrderPage() { return <TrackOrderPageClient />; }
