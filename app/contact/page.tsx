import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description: "تواصل مع Graduation Morocco للاستفسار عن بدلات التخرج والطلبات الفردية والجماعية في المغرب.",
  alternates: { canonical: "/contact" },
};

const phone = "+212717208919";
const whatsapp = "https://wa.me/212717208919";

export default function ContactPage() {
  return (
    <div className="orderRoute" dir="rtl">
      <header className="orderSiteHeader">
        <Link className="orderBrand" href="/" aria-label="Graduation Morocco — الرئيسية">
          <Image src="/logo.png" width={188} height={62} alt="Graduation Morocco" priority />
        </Link>
        <nav className="orderHeaderNav" aria-label="التنقل">
          <Link href="/">الرئيسية</Link>
          <Link href="/order">طلب فردي</Link>
          <Link href="/group-orders">طلب جماعي</Link>
        </nav>
      </header>

      <main className="utilityPage orderPage">
        <section className="orderShell">
          <header className="orderIntro">
            <p className="eyebrow">نحن هنا لمساعدتك</p>
            <h1>تواصل معنا</h1>
            <p>للاستفسار عن المنتجات، التخصيص، التوصيل أو تنسيق طلبات التخرج الجماعية، يسعدنا التواصل معك.</p>
          </header>

          <div className="contactPageGrid">
            <article className="contactPageCard">
              <span className="contactPageIcon" aria-hidden="true">◉</span>
              <h2>WhatsApp</h2>
              <p>راسلنا مباشرة وسنساعدك في استفسارك أو في تجهيز طلبك.</p>
              <a className="submitOrder contactPageAction" href={whatsapp} target="_blank" rel="noopener noreferrer">ابدأ محادثة على WhatsApp</a>
              <a className="contactPagePhone" href={`tel:${phone}`} dir="ltr">{phone}</a>
            </article>
            <article className="contactPageCard contactPageInfo">
              <span className="contactPageIcon" aria-hidden="true">✦</span>
              <h2>كيف يمكننا مساعدتك؟</h2>
              <ul>
                <li>الاستفسار عن بدلات وأوشحة التخرج.</li>
                <li>اختيار الشراء أو الكراء.</li>
                <li>تنسيق طلب جماعي من 5 إلى 100 شخص.</li>
                <li>متابعة طلب تم إرساله مسبقًا.</li>
              </ul>
              <div className="contactPageLinks">
                <Link href="/order">إنشاء طلب فردي</Link>
                <Link href="/group-orders">إنشاء طلب جماعي</Link>
                <Link href="/track-order">تتبع الطلب</Link>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer className="orderSiteFooter">
        <div className="orderFooterBottom">
          <p>© 2026 Graduation Morocco. جميع الحقوق محفوظة.</p>
          <p className="orderFooterCredit">تصميم وتطوير <span>MAQTA Studio</span></p>
        </div>
      </footer>
    </div>
  );
}
