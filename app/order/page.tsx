import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import OrderClient from "./OrderClient";

export const metadata: Metadata = {
  title: "اطلب بدلة تخرج في المغرب",
  description:
    "اطلب بدلة تخرج للشراء أو الكراء في المغرب بدون حساب، مع اختيار القماش واللون والتوصيل وطريقة الدفع.",
  alternates: { canonical: "/order" },
};

export default function OrderPage() {
  return (
    <div className="orderRoute" dir="rtl">
      <header className="orderSiteHeader">
        <Link className="orderBrand" href="/" aria-label="Graduation Morocco — الرئيسية">
          <Image src="/logo.png" width={188} height={62} alt="Graduation Morocco" priority />
        </Link>
        <nav className="orderHeaderNav" aria-label="روابط صفحة الطلب">
          <Link href="/">الرئيسية</Link>
          <Link href="/track-order">تتبع الطلب</Link>
        </nav>
      </header>

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

      <footer className="orderSiteFooter">
        <div className="orderFooterBrand">
          <Image src="/logo_mark.png" width={62} height={62} alt="" />
          <div>
            <strong>Graduation Morocco</strong>
            <p>تجربة تخرج أنيقة، واضحة ومصممة بعناية.</p>
          </div>
        </div>
        <nav aria-label="روابط الفوتر">
          <Link href="/">الرئيسية</Link>
          <Link href="/track-order">تتبع الطلب</Link>
        </nav>
        <p className="orderFooterCredit">تصميم وتطوير <span>MAQTA Studio</span></p>
      </footer>
    </div>
  );
}
