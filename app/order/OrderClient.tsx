"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
import { useLanguage } from "@/components/LanguageProvider";
import { quoteOrder, submitOrder, type OrderDraft, type PrintingOption } from "@/lib/order-service";
import { uploadGraduationImage } from "@/lib/image-upload";

const TIMES = Array.from({ length: 13 }, (_, i) => `${String(i + 9).padStart(2, "0")}:00`);

const ERROR_EN: Record<string, string> = {
  "تعذر تحميل إعدادات الطلب الحالية.": "Could not load the current order settings.",
  "تعذر رفع الشعار.": "Could not upload the logo.",
  "تعذر رفع الصورة.": "Could not upload the image.",
  "تعذر إرسال الطلب.": "Could not submit the order.",
  "المنتج المحدد غير متاح حاليًا.": "The selected product is currently unavailable.",
  "مدينة التوصيل المحددة غير متاحة حاليًا.": "Delivery is not available in the selected city.",
  "اختر نوع الطباعة.": "Choose a printing type.",
  "أدخل نص الطباعة المطلوب بشكل صحيح.": "Enter valid text for printing.",
  "ارفع شعارًا صالحًا للطباعة.": "Upload a valid logo for printing.",
  "استقبال الطلبات متوقف مؤقتًا.": "Order submissions are temporarily paused.",
  "طلبات الشراء متوقفة مؤقتًا.": "Purchase orders are temporarily paused.",
  "طلبات الكراء متوقفة مؤقتًا.": "Rental orders are temporarily paused.",
  "أدخل الاسم الكامل بشكل صحيح.": "Enter your full name.",
  "أدخل رقم هاتف مغربي صحيح يبدأ بـ05 أو 06 أو 07.": "Enter a valid Moroccan phone number starting with 05, 06 or 07.",
  "اختر لون الوشاح.": "Choose a shawl colour.",
  "أدخل عنوان التوصيل.": "Enter the delivery address.",
  "اختر وقتًا صالحًا للموعد.": "Choose a valid time.",
  "اختر تاريخ الاستلام أو التوصيل.": "Choose a collection or delivery date.",
  "موعد الطلب غير صالح.": "The selected order date or time is invalid.",
  "الطباعة والصور المرجعية متاحة للشراء فقط.": "Printing and reference images are available for purchases only.",
  "يمكن رفع حتى 4 صور مرجعية صالحة.": "You can upload up to 4 valid reference images.",
  "تعذر احتساب السعر.": "Could not calculate the price.",
  "الدفع نقدًا عند المحل غير متاح لهذا الطلب.": "Cash at the store is not available for this order.",
  "التحويل البنكي غير متاح حاليًا.": "Bank transfer is currently unavailable.",
  "التحويل عبر وكالة غير متاح حاليًا.": "Cash transfer through an agency is currently unavailable.",
  "اختر وكالة التحويل.": "Choose a transfer agency.",
  "خيار التسبيق غير متاح حاليًا.": "The deposit option is currently unavailable.",
  "خيار الدفع الكامل غير متاح حاليًا.": "Full payment is currently unavailable.",
  "اختر طريقة إتمام الدفع.": "Choose a payment method."
};


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
  const { isArabic } = useLanguage();
  const tr = useCallback((ar: string, en: string) => isArabic ? ar : en, [isArabic]);
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
  const [expandedPrinting, setExpandedPrinting] = useState<"rightShawl" | "leftShawl" | "backShawl" | "cap" | null>(null);

  useEffect(() => {
    Promise.all([loadProducts(), loadDeliveryCities(), loadShopSettings(), loadOrderRules()])
      .then(([p, c, s, r]) => {
        setProducts(p);
        setCities(c);
        setShop(s);
        setRules(r);
      })
      .catch(() => setMessage(tr("تعذر تحميل إعدادات الطلب الحالية.", "Could not load the current order settings.")))
      .finally(() => setLoadingData(false));
  }, [tr]);

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
      setMessage(error instanceof Error ? (isArabic ? error.message : ERROR_EN[error.message] ?? error.message) : tr("تعذر رفع الشعار.", "Could not upload the logo."));
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
      setMessage(error instanceof Error ? (isArabic ? error.message : ERROR_EN[error.message] ?? error.message) : tr("تعذر رفع الصورة.", "Could not upload the image."));
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
      setMessage(error instanceof Error ? (isArabic ? error.message : ERROR_EN[error.message] ?? error.message) : tr("تعذر إرسال الطلب.", "Could not submit the order."));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="orderSuccess" role="status">
        <span className="successMark">✓</span>
        <h2>{tr("تم استلام طلبك", "Your order has been received")}</h2>
        <p>{tr("احتفظ برقم الطلب لتتبعه لاحقًا.", "Keep your order number to track it later.")}</p>
        <strong dir="ltr">{success}</strong>
        <a className="primaryButton" href="/track-order">{tr("تتبع الطلب", "Track order")}</a>
      </div>
    );
  }

  return (
    <form className="orderForm" onSubmit={onSubmit}>
      {loadingData && <p className="formNotice">{tr("جاري تحميل المنتجات والأسعار الحالية…", "Loading products and current prices…")}</p>}
      {message && <p className="formError">{message}</p>}

      <section className="formSection">
        <StepHeading number={1}>{tr("نوع الطلب", "Order type")}</StepHeading>
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
              }}>{tr(value, value === "شراء" ? "Purchase" : "Rental")}</button>
          ))}
        </div>
      </section>

      <section className="formSection">
        <StepHeading number={2}>{tr("المنتج", "Product")}</StepHeading>
        <div className="fieldGrid">
          <label>{tr("المنتج", "Product")}
            <select value={draft.productType} onChange={(e) => patch("productType", e.target.value as OrderDraft["productType"])}>
              <option value="fullOutfit">{tr("بدلة كاملة", "Full outfit")}</option>
              <option value="shawlAndCap">{tr("وشاح وقبعة", "Shawl and cap")}</option>
              <option value="shawlOnly">{tr("وشاح فقط", "Shawl only")}</option>
            </select>
          </label>
          {draft.productType !== "shawlOnly" && (
            <label>{tr("الجنس", "Gender")}
              <select value={draft.gender} onChange={(e) => patch("gender", e.target.value as OrderDraft["gender"])}>
                <option value="ذكر">{tr("ذكر", "Male")}</option>
                <option value="أنثى">{tr("أنثى", "Female")}</option>
              </select>
            </label>
          )}
          <label>{tr("القماش", "Fabric")}
            <select value={draft.fabric} onChange={(e) => patch("fabric", e.target.value as OrderDraft["fabric"])}>
              <option value="ساتان">{tr("ساتان", "Satin")}</option>
              <option value="موبرة">{tr("موبرة", "Velvet")}</option>
            </select>
          </label>
          <label>{tr("لون الوشاح", "Shawl colour")}
            <input value={!isArabic && draft.shawlColor === "ذهبي" ? "Gold" : draft.shawlColor} onChange={(e) => patch("shawlColor", e.target.value)} maxLength={80} required />
          </label>
        </div>
      </section>


      {draft.orderType === "شراء" && (
        <section className="formSection">
          <StepHeading number={3}>{tr("الطباعة والتخصيص", "Printing and customization")}</StepHeading>
          <p className="sectionHint">{tr("الطباعة اختيارية. طباعة الوشاح تضيف 40 درهم، وطباعة القبعة تضيف 40 درهم.", "Printing is optional. Shawl printing adds 40 MAD, and cap printing adds 40 MAD.")}</p>
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
                  <div className="printingHead">
                    <label className="toggleRow">
                      <input className="toggleInput" type="checkbox" checked={option.enabled}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          patchPrinting(key, enabled
                            ? { enabled: true, type: option.type || "text" }
                            : { enabled: false, type: "", text: "", logoPath: null });
                          setExpandedPrinting(enabled ? key : (expandedPrinting === key ? null : expandedPrinting));
                        }} />
                      <span className="toggleVisual" aria-hidden="true"><span /></span>
                      <strong>{tr(label, key === "rightShawl" ? "Right side of shawl" : key === "leftShawl" ? "Left side of shawl" : key === "backShawl" ? "Back of shawl" : "Cap")}</strong>
                    </label>
                    {option.enabled && (
                      <button className="printingExpand" type="button"
                        aria-expanded={expandedPrinting === key}
                        onClick={() => setExpandedPrinting((current) => current === key ? null : key)}>
                        {expandedPrinting === key ? tr("إغلاق", "Close") : tr("تعديل", "Edit")}
                      </button>
                    )}
                  </div>
                  {option.enabled && expandedPrinting !== key && (
                    <p className="printingSummary">
                      {option.type === "text" ? tr("نص", "Text") : option.type === "logo" ? tr("شعار", "Logo") : tr("نص + شعار", "Text + logo")}
                      {option.text ? ` · ${option.text.slice(0, 28)}${option.text.length > 28 ? "…" : ""}` : ""}
                      {option.logoPath ? ` · ${tr("تم رفع الشعار", "Logo uploaded")}` : ""}
                    </p>
                  )}
                  {option.enabled && expandedPrinting === key && (
                    <div className="printingDetails">
                      <label>{tr("نوع الطباعة", "Printing type")}
                        <select value={option.type} onChange={(e) => patchPrinting(key, { type: e.target.value as PrintingOption["type"] })}>
                          <option value="text">{tr("نص", "Text")}</option>
                          <option value="logo">{tr("شعار", "Logo")}</option>
                          <option value="both">{tr("نص + شعار", "Text + logo")}</option>
                        </select>
                      </label>
                      {(option.type === "text" || option.type === "both") && (
                        <label>{tr("النص المطلوب", "Text to print")}
                          <input maxLength={500} value={option.text}
                            onChange={(e) => patchPrinting(key, { text: e.target.value })} />
                        </label>
                      )}
                      {(option.type === "logo" || option.type === "both") && (
                        <div className="uploadField">
                          <span className="uploadLabel">{tr("رفع الشعار", "Upload logo")}</span>
                          <label className={uploading ? "customUpload isDisabled" : "customUpload"}>
                            <input type="file" accept="image/*" disabled={uploading}
                              onChange={(e) => uploadLogo(key, e.target.files?.[0])} />
                            <span className="uploadIcon" aria-hidden="true">↑</span>
                            <span>{uploading ? tr("جاري الرفع…", "Uploading…") : option.logoPath ? tr("استبدال الشعار", "Replace logo") : tr("اختر صورة الشعار", "Choose logo image")}</span>
                          </label>
                          {option.logoPath && <span className="uploadDone">{tr("تم رفع الشعار ✓", "Logo uploaded ✓")}</span>}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="referenceBox">
            <h3>{tr("صور مرجعية", "Reference images")}</h3>
            <p>{tr("يمكنك رفع حتى 4 صور للتصميم المطلوب.", "You can upload up to 4 reference images for your design.")}</p>
            <label className={(uploading || draft.referenceImages.length >= 4) ? "customUpload referenceUpload isDisabled" : "customUpload referenceUpload"}>
              <input type="file" accept="image/*" disabled={uploading || draft.referenceImages.length >= 4}
                onChange={(e) => addReference(e.target.files?.[0])} />
              <span className="uploadIcon" aria-hidden="true">↑</span>
              <span>{uploading ? tr("جاري رفع الصورة…", "Uploading image…") : draft.referenceImages.length >= 4 ? tr("تم رفع الحد الأقصى", "Maximum reached") : tr("اختر صورة", "Choose image")}</span>
              <strong>{draft.referenceImages.length}/4</strong>
            </label>
            {draft.referenceImages.length > 0 && (
              <div className="referenceList">
                {draft.referenceImages.map((url, index) => (
                  <button type="button" key={url}
                    onClick={() => setDraft((d) => ({ ...d, referenceImages: d.referenceImages.filter((_, i) => i !== index) }))}>
                    {tr("صورة", "Image")} {index + 1} ×
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}


      <section className="formSection">
        <StepHeading number={draft.orderType === "شراء" ? 4 : 3}>{tr("بياناتك", "Your details")}</StepHeading>
        <div className="fieldGrid">
          <label>{tr("الاسم الكامل", "Full name")}
            <input value={draft.fullName} onChange={(e) => patch("fullName", e.target.value)} maxLength={120} required />
          </label>
          <label>{tr("رقم الهاتف", "Phone number")}
            <input value={draft.phoneNumber} onChange={(e) => patch("phoneNumber", e.target.value)}
              inputMode="tel" placeholder="06XXXXXXXX" maxLength={10} required dir="ltr" />
          </label>
        </div>
      </section>

      <section className="formSection">
        <StepHeading number={draft.orderType === "شراء" ? 5 : 4}>{tr("الاستلام والتوصيل", "Collection and delivery")}</StepHeading>
        <div className="choiceGrid">
          <button type="button" className={draft.deliveryMethod === "homeDelivery" ? "choice active" : "choice"}
            onClick={() => patch("deliveryMethod", "homeDelivery")}>{tr("توصيل للمنزل", "Home delivery")}</button>
          <button type="button" className={draft.deliveryMethod === "pickup" ? "choice active" : "choice"}
            onClick={() => { patch("deliveryMethod", "pickup"); patch("city", "Fes"); }}>{tr("الاستلام", "Pickup")}</button>
        </div>
        <div className="fieldGrid">
          <label>{tr("المدينة", "City")}
            <select value={draft.city} disabled={draft.deliveryMethod === "pickup"} onChange={(e) => patch("city", e.target.value)}>
              {cities.filter((c) => c.active).map((city) => <option key={city.name} value={city.name}>{city.name}</option>)}
            </select>
          </label>
          {draft.deliveryMethod === "homeDelivery" && (
            <label>{tr("العنوان", "Address")}
              <input value={draft.address} onChange={(e) => patch("address", e.target.value)} maxLength={500} required />
            </label>
          )}
          <label>{tr("التاريخ", "Date")}
            <input type="date" min={minDate} value={draft.deliveryDate} onChange={(e) => patch("deliveryDate", e.target.value)} required />
          </label>
          <label>{tr("الوقت", "Time")}
            <select value={draft.deliveryTime} onChange={(e) => patch("deliveryTime", e.target.value)}>
              {TIMES.map((time) => <option key={time} value={time}>{time}</option>)}
            </select>
          </label>
        </div>
        {draft.orderType === "كراء" && (
          <div className="formNotice" role="status">
            <strong>{tr("موعد إرجاع الكراء", "Rental return time")}</strong>
            {draft.deliveryDate ? (
              <p>
                {DateTime.fromISO(`${draft.deliveryDate}T${draft.deliveryTime}`, { zone: "Africa/Casablanca" })
                  .plus({ hours: 24 }).toFormat("dd/MM/yyyy")} — {tr("الساعة", "at")}{" "}
                {DateTime.fromISO(`${draft.deliveryDate}T${draft.deliveryTime}`, { zone: "Africa/Casablanca" })
                  .plus({ hours: 24 }).toFormat("HH:mm")}
              </p>
            ) : <p>{tr("اختر تاريخ ووقت الاستلام لعرض موعد الإرجاع.", "Choose a collection date and time to see the return time.")}</p>}
            <p>{tr("مدة الكراء 24 ساعة كاملة من وقت الاستلام. سيتم حفظ الموعد الظاهر أعلاه في طلبك.", "The rental period is 24 hours from collection. The return time shown above will be saved with your order.")}</p>
          </div>
        )}
      </section>

      <section className="formSection">
        <StepHeading number={draft.orderType === "شراء" ? 6 : 5}>{tr("الدفع", "Payment")}</StepHeading>
        <div className="fieldGrid">
          <label>{tr("طريقة الدفع", "Payment method")}
            <select value={draft.paymentMethod} onChange={(e) => {
              const value = e.target.value as OrderDraft["paymentMethod"];
              patch("paymentMethod", value);
              if (value === "cash_at_store") {
                patch("bankTransferPlan", "");
                patch("paymentProvider", "");
              }
            }}>
              {shop.bankTransferEnabled && <option value="bank_transfer">{tr("تحويل بنكي", "Bank transfer")}</option>}
              {shop.cashTransferAgencyEnabled && <option value="cash_transfer_agency">{tr("تحويل عبر وكالة", "Cash transfer agency")}</option>}
              {shop.cashAtStoreEnabled && draft.deliveryMethod === "pickup" && <option value="cash_at_store">{tr("نقدًا عند الاستلام", "Cash on pickup")}</option>}
            </select>
          </label>
          {draft.paymentMethod !== "cash_at_store" && (
            <label>{tr("المبلغ", "Amount")}
              <select value={draft.bankTransferPlan} onChange={(e) => patch("bankTransferPlan", e.target.value as OrderDraft["bankTransferPlan"])}>
                {shop.depositPaymentEnabled && <option value="deposit">{tr("تسبيق", "Deposit")} {shop.depositPercentage}%</option>}
                {shop.fullPaymentEnabled && <option value="full">{tr("الدفع الكامل", "Full payment")}</option>}
              </select>
            </label>
          )}
          {draft.paymentMethod === "cash_transfer_agency" && (
            <label>{tr("الوكالة", "Agency")}
              <select value={draft.paymentProvider} onChange={(e) => patch("paymentProvider", e.target.value as OrderDraft["paymentProvider"])} required>
                <option value="">{tr("اختر الوكالة", "Choose an agency")}</option><option value="cash_plus">Cash Plus</option>
                <option value="wafacash">Wafacash</option><option value="western_union">Western Union</option>
                <option value="other">{tr("أخرى", "Other")}</option>
              </select>
            </label>
          )}
        </div>
      </section>

      <section className="formSection">
        <StepHeading number={draft.orderType === "شراء" ? 7 : 6}>{tr("ملاحظات", "Notes")}</StepHeading>
        <label>{tr("ملاحظات الطلب", "Order notes")}
          <textarea value={draft.notes} onChange={(e) => patch("notes", e.target.value)} maxLength={1000} rows={3} />
        </label>
        <label>{tr("ملاحظات التوصيل", "Delivery notes")}
          <textarea value={draft.deliveryNotes} onChange={(e) => patch("deliveryNotes", e.target.value)} maxLength={1000} rows={3} />
        </label>
      </section>

      <aside className="orderSummary">
        <div><span>{tr("المنتج", "Product")}</span><strong>{quote?.productPrice ?? "—"} {tr("درهم", "MAD")}</strong></div>
        <div><span>{tr("التوصيل", "Delivery")}</span><strong>{quote?.deliveryFee ?? "—"} {tr("درهم", "MAD")}</strong></div>
        <div className="summaryTotal"><span>{tr("المجموع", "Total")}</span><strong>{quote?.total ?? "—"} {tr("درهم", "MAD")}</strong></div>
      </aside>

      <button className="submitOrder" type="submit" disabled={submitting || loadingData || uploading || !quote}>
        {submitting ? tr("جاري إرسال الطلب…", "Submitting order…") : tr("تأكيد وإرسال الطلب", "Confirm and submit order")}
      </button>
      <p className="privacyNote">{tr("لا تحتاج إلى حساب. تُستخدم بياناتك لمعالجة الطلب والتواصل معك فقط.", "No account is needed. Your details are used only to process your order and contact you.")}</p>
    </form>
  );
}
