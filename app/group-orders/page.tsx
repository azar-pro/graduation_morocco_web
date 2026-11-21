import type { Metadata } from "next";
import GroupOrdersPageClient from "./GroupOrdersPageClient";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "طلبات بدلات التخرج الجماعية في المغرب",
  description:
    "اطلب بدلات تخرج جماعية للدفعات والجامعات في المغرب، شراء أو كراء، بدون إنشاء حساب.",
  alternates: { canonical: "/group-orders" },
};

export default function GroupOrdersPage() { return <GroupOrdersPageClient />; }
