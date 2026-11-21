"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export type Locale = "ar" | "en";
type LanguageContextValue = { locale: Locale; isArabic: boolean; setLocale: (locale: Locale) => void; toggleLocale: () => void };
const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "graduation-morocco-locale";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const [locale, setLocaleState] = useState<Locale>("ar");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "ar" || saved === "en") queueMicrotask(() => setLocaleState(saved));
    } catch {}
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch {}
  }, []);

  const toggleLocale = useCallback(() => setLocale(locale === "ar" ? "en" : "ar"), [locale, setLocale]);

  useEffect(() => {
    if (!ready) return;
    const activeLocale = isAdminRoute ? "ar" : locale;
    document.documentElement.lang = activeLocale;
    document.documentElement.dir = activeLocale === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.locale = activeLocale;
  }, [locale, ready, isAdminRoute]);

  return <LanguageContext.Provider value={{ locale, isArabic: locale === "ar", setLocale, toggleLocale }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used within LanguageProvider");
  return value;
}
