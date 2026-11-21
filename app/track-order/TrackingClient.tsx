"use client";

import { FormEvent, useState } from "react";
import { trackPublicOrder, type TrackingResult } from "@/lib/tracking";
import { useLanguage } from "@/components/LanguageProvider";

const labels: Record<string, string> = {
  received: "تم استلام الطلب",
  review: "قيد المراجعة",
  working: "جاري التنفيذ",
  printing: "جاري الطباعة",
  ready: "جاهز",
  delivery: "في التوصيل",
  completed: "تم التسليم",
  cancelled: "ملغي",
};

export default function TrackingClient() {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => isArabic ? ar : en;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrackingResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResults(await trackPublicOrder(query));
    } catch {
      setError(t("تعذر الاتصال بخدمة التتبع الآن. حاول مرة أخرى.", "The tracking service is unavailable right now. Please try again."));
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="trackingForm" onSubmit={submit}>
        <label htmlFor="tracking">{t("رقم الطلب أو رقم الهاتف", "Order number or phone number")}</label>
        <input
          id="tracking"
          name="tracking"
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder={t("GM-2026-000018 أو GRP-2026-ABCDEFGH أو 06XXXXXXXX", "GM-2026-000018, GRP-2026-ABCDEFGH or 06XXXXXXXX")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={24}
        />
        <button type="submit" disabled={loading}>
          {loading ? t("جاري البحث…", "Searching…") : t("بحث", "Search")}
        </button>
      </form>

      <div aria-live="polite">
        {error && <p className="formError">{error}</p>}
        {results?.length === 0 && (
          <p className="emptyState">{t("لم يتم العثور على طلب مطابق.", "No matching order was found.")}</p>
        )}
        {results && results.length > 0 && (
          <div className="trackingResults">
            {results.map((order) => (
              <article className="trackingResult" key={order.orderNumber}>
                <span className="trackingNumber">{order.orderNumber}</span>
                <strong>{(isArabic ? (labels[order.status] ?? t("حالة الطلب غير معروفة", "حالة الطلب غير معروفة")) : ({ received: "Order received", review: "Under review", working: "In progress", printing: "Printing", ready: "Ready", delivery: "Out for delivery", completed: "Delivered", cancelled: "Cancelled" }[order.status] ?? "Unknown order status"))}</strong>
                <small>{order.orderNumber.startsWith("GRP-") ? `${t("طلب جماعي", "Group order")} · ${order.quantity ?? "—"} ${t("أفراد", "people")}` : t("طلب فردي", "Individual order")} · {t(order.orderType, order.orderType === "شراء" ? "Purchase" : "Rental")} · {t(order.productType, order.productType === "fullOutfit" ? "Full outfit" : order.productType === "shawlAndCap" ? "Shawl and cap" : "Shawl only")}</small>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
