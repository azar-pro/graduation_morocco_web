"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function LanguageSwitcher({ className = "appLanguage" }: { className?: string }) {
  const { isArabic, toggleLocale } = useLanguage();
  return <button className={className} type="button" onClick={toggleLocale}
    aria-label={isArabic ? "Switch to English" : "التبديل إلى العربية"}
    title={isArabic ? "English" : "العربية"}>{isArabic ? "EN" : "AR"}</button>;
}
