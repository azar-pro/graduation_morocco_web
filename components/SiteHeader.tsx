"use client";

import Image from "next/image";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";

export default function SiteHeader() {
  const { isArabic } = useLanguage();
  const t = isArabic
    ? { home: "الرئيسية", individual: "طلب فردي", group: "طلب جماعي", tracking: "تتبع الطلب", contact: "تواصل معنا", nav: "التنقل الرئيسي" }
    : { home: "Home", individual: "Individual order", group: "Group order", tracking: "Track order", contact: "Contact us", nav: "Main navigation" };
  return (
    <header className="orderSiteHeader">
      <Link className="orderBrand" href="/" aria-label={`Graduation Morocco — ${t.home}`}>
        <Image src="/logo.png" width={188} height={62} alt="Graduation Morocco" priority />
      </Link>
      <nav className="orderHeaderNav" aria-label={t.nav}>
        <Link href="/">{t.home}</Link>
        <Link href="/order">{t.individual}</Link>
        <Link href="/group-orders">{t.group}</Link>
        <Link href="/track-order">{t.tracking}</Link>
        <Link href="/contact">{t.contact}</Link>
        <LanguageSwitcher className="appLanguage" />
      </nav>
    </header>
  );
}
