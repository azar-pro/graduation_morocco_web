"use client";

import { FormEvent, useState } from "react";
import { trackPublicOrder, type TrackingResult } from "@/lib/tracking";

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
      setError("تعذر الاتصال بخدمة التتبع الآن. حاول مرة أخرى.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="trackingForm" onSubmit={submit}>
        <label htmlFor="tracking">رقم الطلب أو رقم الهاتف</label>
        <input
          id="tracking"
          name="tracking"
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="GM-2026-000018 أو 06XXXXXXXX"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={24}
        />
        <button type="submit" disabled={loading}>
          {loading ? "جاري البحث…" : "بحث"}
        </button>
      </form>

      <div aria-live="polite">
        {error && <p className="formError">{error}</p>}
        {results?.length === 0 && (
          <p className="emptyState">لم يتم العثور على طلب مطابق.</p>
        )}
        {results && results.length > 0 && (
          <div className="trackingResults">
            {results.map((order) => (
              <article className="trackingResult" key={order.orderNumber}>
                <span className="trackingNumber">{order.orderNumber}</span>
                <strong>{labels[order.status] ?? "حالة الطلب غير معروفة"}</strong>
                <small>{order.orderType} · {order.productType}</small>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
