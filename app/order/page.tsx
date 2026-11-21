import type { Metadata } from "next";
import OrderPageClient from "./OrderPageClient";
import SiteHeader from "@/components/SiteHeader";
import OrderClient from "./OrderClient";

export const metadata: Metadata = {
  title: "اطلب بدلة تخرج في المغرب",
  description:
    "اطلب بدلة تخرج للشراء أو الكراء في المغرب بدون حساب، مع اختيار القماش واللون والتوصيل وطريقة الدفع.",
  alternates: { canonical: "/order" },
};

export default function OrderPage() { return <OrderPageClient />; }
