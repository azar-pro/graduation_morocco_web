import type { Metadata } from "next";
import GroupOrderClient from "./GroupOrderClient";

export const metadata: Metadata = {
  title: "طلبات بدلات التخرج الجماعية في المغرب",
  description:
    "اطلب بدلات تخرج جماعية للدفعات والجامعات في المغرب، شراء أو كراء، بدون إنشاء حساب.",
  alternates: { canonical: "/group-orders" },
};

export default function GroupOrdersPage() {
  return (
    <main className="utilityPage orderPage">
      <section className="orderShell">
        <header className="orderIntro">
          <p className="eyebrow">للمجموعات والدفعات الجامعية</p>
          <h1>طلب جماعي من 5 إلى 100 شخص</h1>
          <p>
            اختر الشراء أو الكراء، أدخل معلومات مسؤول المجموعة، ثم أرسل الطلب مباشرة.
          </p>
        </header>
        <GroupOrderClient />
      </section>
    </main>
  );
}
