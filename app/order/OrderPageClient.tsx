"use client";
import Link from "next/link";
import Image from "next/image";
import SiteHeader from "@/components/SiteHeader";
import OrderClient from "./OrderClient";
import { useLanguage } from "@/components/LanguageProvider";
export default function OrderPageClient() {
 const { isArabic }=useLanguage(); const t=(ar:string,en:string)=>isArabic?ar:en;
 return <div className="orderRoute"><SiteHeader/><main className="utilityPage orderPage"><section className="orderShell">
 <header className="orderIntro"><p className="eyebrow">{t("طلب مباشر بدون حساب","Direct order, no account needed")}</p>
 <h1>{t("جهّز طلب تخرجك خطوة بخطوة","Build your graduation order step by step")}</h1>
 <p>{t("اختر المنتج والتفاصيل وموعد الاستلام أو التوصيل، ثم أرسل الطلب مباشرة إلى Morocco Graduation.","Choose your product, options, and collection or delivery time, then submit your order directly to Morocco Graduation.")}</p></header>
 <OrderClient/></section></main>
 <footer className="orderSiteFooter"><div className="orderFooterMain">
 <div className="orderFooterBrand"><Image src="/logo.png" width={180} height={78} alt="Graduation Morocco"/><p>{t("تجربة تخرج أنيقة، واضحة ومصممة بعناية.","An elegant graduation experience, clear and thoughtfully designed.")}</p></div>
 <div className="orderFooterColumn"><strong>{t("روابط سريعة","Quick links")}</strong><nav aria-label={t("روابط سريعة","Quick links")}><Link href="/">{t("الرئيسية","Home")}</Link><Link href="/order">{t("طلب جديد","New order")}</Link><Link href="/track-order">{t("تتبع الطلب","Track order")}</Link><Link href="/group-orders">{t("الطلب الجماعي","Group order")}</Link><Link href="/contact">{t("تواصل معنا","Contact us")}</Link></nav></div>
 <div className="orderFooterColumn"><strong>{t("حول الخدمة","About")}</strong><nav aria-label={t("حول الخدمة","About")}><Link href="/#about">{t("من نحن","About us")}</Link><Link href="/#services">{t("خدماتنا","Services")}</Link><Link href="/#contact">{t("تواصل معنا","Contact us")}</Link></nav></div>
 </div><div className="orderFooterBottom"><p>© 2026 Graduation Morocco. {t("جميع الحقوق محفوظة.","All rights reserved.")}</p><p className="orderFooterCredit">{t("تصميم وتطوير","Designed and developed by")} <span>MAQTA Studio</span></p></div></footer></div>;
}
