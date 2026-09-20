import type { Metadata } from "next";
import TrackingClient from "./TrackingClient";

export const metadata: Metadata = {
  title: "تتبع الطلب",
  description: "تتبع حالة طلبك لدى Morocco Graduation باستخدام رقم الطلب أو رقم الهاتف.",
  robots: { index: false, follow: false },
};

export default function TrackOrderPage() {
  return (
    <main className="utilityPage">
      <section className="utilityCard">
        <p className="eyebrow">تتبع الطلب</p>
        <h1>اعرف حالة طلبك</h1>
        <p>
          أدخل رقم الطلب أو رقم الهاتف المغربي المستخدم عند الطلب. لا تحتاج إلى إنشاء حساب.
        </p>
        <TrackingClient />
      </section>
    </main>
  );
}
