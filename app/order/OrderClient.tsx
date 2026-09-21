"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { DateTime } from "luxon";
import {
  DEFAULT_CITIES,
  DEFAULT_RULES,
  DEFAULT_SHOP,
  loadDeliveryCities,
  loadOrderRules,
  loadProducts,
  loadShopSettings,
} from "@/lib/public-data";
import type { DeliveryCity, OrderRules, PublicProduct, ShopSettings } from "@/lib/order-types";
import { quoteOrder, submitOrder, type OrderDraft, type PrintingOption } from "@/lib/order-service";
import { uploadGraduationImage } from "@/lib/image-upload";

const TIMES = Array.from({ length: 13 }, (_, i) => `${String(i + 9).padStart(2, "0")}:00`);

function StepHeading({ number, children }: { number: number; children: ReactNode }) {
  return (
    <h2 className="formStepTitle">
      <span className="formStepNumber" aria-hidden="true">{number}</span>
      <span>{children}</span>
    </h2>
  );
}

const initialDraft: OrderDraft = {
  orderType: "شراء",
  productType: "fullOutfit",
  gender: "ذكر",
  fabric: "ساتان",
  shawlColor: "ذهبي",
  fullName: "",
  phoneNumber: "",
  city: "Fes",
  address: "",
  deliveryMethod: "homeDelivery",
  deliveryDate: "",
  deliveryTime: "12:00",
  paymentMethod: "bank_transfer",
  bankTransferPlan: "deposit",
  paymentProvider: "",
  notes: "",
  deliveryNotes: "",
  rightShawl: { enabled: false, type: "", text: "", logoPath: null },
  leftShawl: { enabled: false, type: "", text: "", logoPath: null },
  backShawl: { enabled: false, type: "", text: "", logoPath: null },
  cap: { enabled: false, type: "", text: "", logoPath: null },
  referenceImages: [],
};

export default function OrderClient() {
  const [draft, setDraft] = useState<OrderDraft>(initialDraft);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [cities, setCities] = useState<DeliveryCity[]>(DEFAULT_CITIES);
  const [shop, setShop] = useState<ShopSettings>(DEFAULT_SHOP);
  const [rules, setRules] = useState<OrderRules>(DEFAULT_RULES);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    Promise.all([loadProducts(), loadDeliveryCities(), loadShopSettings(), loadOrderRules()])
      .then(([p, c, s, r]) => {
        setProducts(p);
        setCities(c);
        setShop(s);
        setRules(r);
      })
      .catch(() => setMessage("تعذر تحميل إعدادات الطلب الحالية."))
      .finally(() => setLoadingData(false));
  }, []);

  const quote = useMemo(() => {
    try {
      return products.length ? quoteOrder(products, cities, draft) : null;
    } catch {
      return null;
    }
  }, [products, cities, draft]);

  const minDate = useMemo(() => {
    const now = DateTime.now().setZone("Africa/Casablanca");
    const min = draft.orderType === "شراء"
      ? now.plus({ days: rules.purchasePreparationDays })
      : now.plus({ hours: rules.rentalAdvanceHours });
    return min.plus({ days: 1 }).toFormat("yyyy-MM-dd");
  }, [draft.orderType, rules]);

  function patch<K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setMessage("");
  }

  function patchPrinting(key: "rightShawl" | "leftShawl" | "backShawl" | "cap", next: Partial<PrintingOption>) {
    setDraft((d) => ({ ...d, [key]: { ...d[key], ...next } }));
    setMessage("");
  }

  async function uploadLogo(key: "rightShawl" | "leftShawl" | "backShawl" | "cap", file?: File) {
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const url = await uploadGraduationImage(file);
      patchPrinting(key, { logoPath: url });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر رفع الشعار.");
    } finally {
      setUploading(false);
    }
  }

  async function addReference(file?: File) {
    if (!file || draft.referenceImages.length >= 4) return;
    setUploading(true);
    setMessage("");
    try {
      const url = await uploadGraduationImage(file);
      setDraft((d) => ({ ...d, referenceImages: [...d.referenceImages, url].slice(0, 4) }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر رفع الصورة.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const result = await submitOrder({ draft, products, cities, shop, rules });
      setSuccess(result.orderNumber);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إرسال الطلب.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="orderSuccess" role="status">
        <span className="successMark">✓</span>
        <h2>تم استلام طلبك</h2>
        <p>احتفظ برقم الطلب لتتبعه لاحقًا.</p>
        <strong dir="ltr">{success}</strong>
        <a className="primaryButton" href="/track-order">تتبع الطلب</a>
      </div>
    );
  }

  return (
    <form className="orderForm" onSubmit={onSubmit}>
      {loadingData && <p className="formNotice">جاري تحميل المنتجات والأسعار الحالية…</p>}
      {message && <p className="formError">{message}</p>}

      <section className="formSection">
        <StepHeading number={1}>نوع الطلب</StepHeading>
        <div className="choiceGrid">
          {(["شراء", "كراء"] as const).map((value) => (
            <button type="button" key={value}
              className={draft.orderType === value ? "choice active" : "choice"}
              onClick={() => {
                patch("orderType", value);
                if (value === "كراء") {
                  setDraft((d) => ({
                    ...d,
                    orderType: value,
                    rightShawl: { enabled: false, type: "", text: "", logoPath: null },
                    leftShawl: { enabled: false, type: "", text: "", logoPath: null },
                    backShawl: { enabled: false, type: "", text: "", logoPath: null },
                    cap: { enabled: false, type: "", text: "", logoPath: null },
                    referenceImages: [],
                  }));
                }
              }}>{value}</button>
          ))}
        </div>
      </section>

      <section className="formSection">
        <StepHeading number={2}>المنتج</StepHeading>
        <div className="fieldGrid">
          <label>المنتج
            <select value={draft.productType} onChange={(e) => patch("productType", e.target.value as OrderDraft["productType"])}>
              <option value="fullOutfit">بدلة كاملة</option>
              <option value="shawlAndCap">وشاح وقبعة</option>
              <option value="shawlOnly">وشاح فقط</option>
            </select>
          </label>
          {draft.productType !== "shawlOnly" && (
            <label>الجنس
              <select value={draft.gender} onChange={(e) => patch("gender", e.target.value as OrderDraft["gender"])}>
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </select>
            </label>
          )}
          <label>القماش
            <select value={draft.fabric} onChange={(e) => patch("fabric", e.target.value as OrderDraft["fabric"])}>
              <option value="ساتان">ساتان</option>
              <option value="موبرة">موبرة</option>
            </select>
          </label>
          <label>لون الوشاح
            <input value={draft.shawlColor} onChange={(e) => patch("shawlColor", e.target.value)} maxLength={80} required />
          </label>
        </div>
      </section>


      {draft.orderType === "شراء" && (
        <section className="formSection">
          <StepHeading number={3}>الطباعة والتخصيص</StepHeading>
          <p className="sectionHint">الطباعة اختيارية. طباعة الوشاح تضيف 40 درهم، وطباعة القبعة تضيف 40 درهم.</p>
          <div className="printingGrid">
            {([
              ["rightShawl", "الجهة اليمنى من الوشاح"],
              ["leftShawl", "الجهة اليسرى من الوشاح"],
              ["backShawl", "ظهر الوشاح"],
              ...(draft.productType === "shawlOnly"
                ? []
                : ([["cap", "القبعة"]] as const)),
            ] satisfies ReadonlyArray<readonly [
              "rightShawl" | "leftShawl" | "backShawl" | "cap",
              string
            ]>).map(([key, label]) => {
              const option = draft[key];
              return (
                <article className={option.enabled ? "printingCard isActive" : "printingCard"} key={key}>
                  <label className="toggleRow">
                    <input className="toggleInput" type="checkbox" checked={option.enabled}
                      onChange={(e) => patchPrinting(key, e.target.checked
                        ? { enabled: true, type: option.type || "text" }
                        : { enabled: false, type: "", text: "", logoPath: null })} />
                    <span className="toggleVisual" aria-hidden="true"><span /></span>
                    <strong>{label}</strong>
                  </label>
                  {option.enabled && (
                    <>
                      <label>نوع الطباعة
                        <select value={option.type} onChange={(e) => patchPrinting(key, { type: e.target.value as PrintingOption["type"] })}>
                          <option value="text">نص</option>
                          <option value="logo">شعار</option>
                          <option value="both">نص + شعار</option>
                        </select>
                      </label>
                      {(option.type === "text" || option.type === "both") && (
                        <label>النص المطلوب
                          <input maxLength={500} value={option.text}
                            onChange={(e) => patchPrinting(key, { text: e.target.value })} />
                        </label>
                      )}
                      {(option.type === "logo" || option.type === "both") && (
                        <div className="uploadField">
                          <span className="uploadLabel">رفع الشعار</span>
                          <label className={uploading ? "customUpload isDisabled" : "customUpload"}>
                            <input type="file" accept="image/*" disabled={uploading}
                              onChange={(e) => uploadLogo(key, e.target.files?.[0])} />
                            <span className="uploadIcon" aria-hidden="true">↑</span>
                            <span>{uploading ? "جاري الرفع…" : option.logoPath ? "استبدال الشعار" : "اختر صورة الشعار"}</span>
                          </label>
                          {option.logoPath && <span className="uploadDone">تم رفع الشعار ✓</span>}
                        </div>
                      )}
                    </>
                  )}
                </article>
              );
            })}
          </div>

          <div className="referenceBox">
            <h3>صور مرجعية</h3>
            <p>يمكنك رفع حتى 4 صور للتصميم المطلوب.</p>
            <label className={(uploading || draft.referenceImages.length >= 4) ? "customUpload referenceUpload isDisabled" : "customUpload referenceUpload"}>
              <input type="file" accept="image/*" disabled={uploading || draft.referenceImages.length >= 4}
                onChange={(e) => addReference(e.target.files?.[0])} />
              <span className="uploadIcon" aria-hidden="true">↑</span>
              <span>{uploading ? "جاري رفع الصورة…" : draft.referenceImages.length >= 4 ? "تم رفع الحد الأقصى" : "اختر صورة"}</span>
              <strong>{draft.referenceImages.length}/4</strong>
            </label>
            {draft.referenceImages.length > 0 && (
              <div className="referenceList">
                {draft.referenceImages.map((url, index) => (
                  <button type="button" key={url}
                    onClick={() => setDraft((d) => ({ ...d, referenceImages: d.referenceImages.filter((_, i) => i !== index) }))}>
                    صورة {index + 1} ×
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}


      <section className="formSection">
        <StepHeading number={draft.orderType === "شراء" ? 4 : 3}>بياناتك</StepHeading>
        <div className="fieldGrid">
          <label>الاسم الكامل
            <input value={draft.fullName} onChange={(e) => patch("fullName", e.target.value)} maxLength={120} required />
          </label>
          <label>رقم الهاتف
            <input value={draft.phoneNumber} onChange={(e) => patch("phoneNumber", e.target.value)}
              inputMode="tel" placeholder="06XXXXXXXX" maxLength={10} required dir="ltr" />
          </label>
        </div>
      </section>

      <section className="formSection">
        <StepHeading number={draft.orderType === "شراء" ? 5 : 4}>الاستلام والتوصيل</StepHeading>
        <div className="choiceGrid">
          <button type="button" className={draft.deliveryMethod === "homeDelivery" ? "choice active" : "choice"}
            onClick={() => patch("deliveryMethod", "homeDelivery")}>توصيل للمنزل</button>
          <button type="button" className={draft.deliveryMethod === "pickup" ? "choice active" : "choice"}
            onClick={() => { patch("deliveryMethod", "pickup"); patch("city", "Fes"); }}>الاستلام</button>
        </div>
        <div className="fieldGrid">
          <label>المدينة
            <select value={draft.city} disabled={draft.deliveryMethod === "pickup"} onChange={(e) => patch("city", e.target.value)}>
              {cities.filter((c) => c.active).map((city) => <option key={city.name} value={city.name}>{city.name}</option>)}
            </select>
          </label>
          {draft.deliveryMethod === "homeDelivery" && (
            <label>العنوان
              <input value={draft.address} onChange={(e) => patch("address", e.target.value)} maxLength={500} required />
            </label>
          )}
          <label>التاريخ
            <input type="date" min={minDate} value={draft.deliveryDate} onChange={(e) => patch("deliveryDate", e.target.value)} required />
          </label>
          <label>الوقت
            <select value={draft.deliveryTime} onChange={(e) => patch("deliveryTime", e.target.value)}>
              {TIMES.map((time) => <option key={time} value={time}>{time}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="formSection">
        <StepHeading number={draft.orderType === "شراء" ? 6 : 5}>الدفع</StepHeading>
        <div className="fieldGrid">
          <label>طريقة الدفع
            <select value={draft.paymentMethod} onChange={(e) => {
              const value = e.target.value as OrderDraft["paymentMethod"];
              patch("paymentMethod", value);
              if (value === "cash_at_store") {
                patch("bankTransferPlan", "");
                patch("paymentProvider", "");
              }
            }}>
              {shop.bankTransferEnabled && <option value="bank_transfer">تحويل بنكي</option>}
              {shop.cashTransferAgencyEnabled && <option value="cash_transfer_agency">تحويل عبر وكالة</option>}
              {shop.cashAtStoreEnabled && draft.deliveryMethod === "pickup" && <option value="cash_at_store">نقدًا عند الاستلام</option>}
            </select>
          </label>
          {draft.paymentMethod !== "cash_at_store" && (
            <label>المبلغ
              <select value={draft.bankTransferPlan} onChange={(e) => patch("bankTransferPlan", e.target.value as OrderDraft["bankTransferPlan"])}>
                {shop.depositPaymentEnabled && <option value="deposit">تسبيق {shop.depositPercentage}%</option>}
                {shop.fullPaymentEnabled && <option value="full">الدفع الكامل</option>}
              </select>
            </label>
          )}
          {draft.paymentMethod === "cash_transfer_agency" && (
            <label>الوكالة
              <select value={draft.paymentProvider} onChange={(e) => patch("paymentProvider", e.target.value as OrderDraft["paymentProvider"])} required>
                <option value="">اختر الوكالة</option><option value="cash_plus">Cash Plus</option>
                <option value="wafacash">Wafacash</option><option value="western_union">Western Union</option>
                <option value="other">أخرى</option>
              </select>
            </label>
          )}
        </div>
      </section>

      <section className="formSection">
        <StepHeading number={draft.orderType === "شراء" ? 7 : 6}>ملاحظات</StepHeading>
        <label>ملاحظات الطلب
          <textarea value={draft.notes} onChange={(e) => patch("notes", e.target.value)} maxLength={1000} rows={3} />
        </label>
        <label>ملاحظات التوصيل
          <textarea value={draft.deliveryNotes} onChange={(e) => patch("deliveryNotes", e.target.value)} maxLength={1000} rows={3} />
        </label>
      </section>

      <aside className="orderSummary">
        <div><span>المنتج</span><strong>{quote?.productPrice ?? "—"} درهم</strong></div>
        <div><span>التوصيل</span><strong>{quote?.deliveryFee ?? "—"} درهم</strong></div>
        <div className="summaryTotal"><span>المجموع</span><strong>{quote?.total ?? "—"} درهم</strong></div>
      </aside>

      <button className="submitOrder" type="submit" disabled={submitting || loadingData || uploading || !quote}>
        {submitting ? "جاري إرسال الطلب…" : "تأكيد وإرسال الطلب"}
      </button>
      <p className="privacyNote">لا تحتاج إلى حساب. تُستخدم بياناتك لمعالجة الطلب والتواصل معك فقط.</p>
    </form>
  );
}
