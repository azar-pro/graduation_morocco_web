"use client";

import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { useLanguage } from "@/components/LanguageProvider";

const whatsapp = "https://wa.me/212717208919";

export default function ContactPageClient() {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => isArabic ? ar : en;
  return (
    <div className="orderRoute">
      <SiteHeader />
      <main className="utilityPage orderPage">
        <section className="orderShell">
          <header className="orderIntro">
            <p className="eyebrow">{t("نحن هنا لمساعدتك", "We’re here to help")}</p>
            <h1>{t("تواصل معنا", "Contact us")}</h1>
            <p>{t("للاستفسار عن المنتجات، التخصيص، التوصيل أو تنسيق طلبات التخرج الجماعية، يسعدنا التواصل معك.", "Questions about products, customization, delivery, or coordinating group graduation orders? We’d be happy to help.")}</p>
          </header>
          <div className="contactPageGrid">
            <article className="contactPageCard">
              <span className="contactPageIcon" aria-hidden="true">◉</span>
              <h2>WhatsApp</h2>
              <p>{t("راسلنا مباشرة وسنساعدك في استفسارك أو في تجهيز طلبك.", "Message us directly and we’ll help with your questions or order.")}</p>
              <a className="submitOrder contactPageAction" href={whatsapp} target="_blank" rel="noopener noreferrer">{t("ابدأ محادثة على WhatsApp", "Start a WhatsApp chat")}</a>
            </article>
            <article className="contactPageCard contactPageInfo">
              <span className="contactPageIcon" aria-hidden="true">✦</span>
              <h2>{t("كيف يمكننا مساعدتك؟", "How can we help?")}</h2>
              <ul>
                <li>{t("الاستفسار عن بدلات وأوشحة التخرج.", "Questions about graduation gowns and stoles.")}</li>
                <li>{t("اختيار الشراء أو الكراء.", "Choosing between purchase and rental.")}</li>
                <li>{t("تنسيق طلب جماعي من 5 إلى 100 شخص.", "Coordinating a group order for 5–100 people.")}</li>
                <li>{t("متابعة طلب تم إرساله مسبقًا.", "Tracking an order you have already submitted.")}</li>
              </ul>
              <div className="contactPageLinks">
                <Link href="/order">{t("إنشاء طلب فردي", "Place an individual order")}</Link>
                <Link href="/group-orders">{t("إنشاء طلب جماعي", "Place a group order")}</Link>
                <Link href="/track-order">{t("تتبع الطلب", "Track an order")}</Link>
              </div>
            </article>
          </div>
        </section>
      </main>
      <footer className="orderSiteFooter"><div className="orderFooterBottom">
        <p>© 2026 Graduation Morocco. {t("جميع الحقوق محفوظة.", "All rights reserved.")}</p>
        <p className="orderFooterCredit">{t("تصميم وتطوير", "Designed and developed by")} <span>MAQTA Studio</span></p>
      </div></footer>
    </div>
  );
}
