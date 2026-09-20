import type { Metadata } from "next";
import OrderClient from "./OrderClient";

export const metadata: Metadata = {
  title: "اطلب بدلة تخرج في المغرب",
  description:
    "اطلب بدلة تخرج للشراء أو الكراء في المغرب بدون حساب، مع اختيار القماش واللون والتوصيل وطريقة الدفع.",
  alternates: { canonical: "/order" },
};

export default function OrderPage() {
  return (
    <main className="utilityPage orderPage">
      <section className="orderShell">
        <header className="orderIntro">
          <p className="eyebrow">طلب مباشر بدون حساب</p>
          <h1>جهّز طلب تخرجك خطوة بخطوة</h1>
          <p>
            اختر المنتج والتفاصيل وموعد الاستلام أو التوصيل، ثم أرسل الطلب مباشرة إلى Morocco Graduation.
          </p>
        </header>
        <OrderClient />
      </section>
    </main>
  );
}
