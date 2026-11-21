"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { submitGroupOrder, type GroupOrderDraft, type GroupPrintingOption } from "@/lib/group-orders";
import { uploadGraduationImage } from "@/lib/image-upload";
import { uploadGroupExcel } from "@/lib/group-file-upload";
import { DEFAULT_CITIES, DEFAULT_RULES, DEFAULT_SHOP, loadDeliveryCities, loadOrderRules, loadProducts, loadShopSettings } from "@/lib/public-data";
import type { DeliveryCity, OrderRules, PublicProduct, ShopSettings } from "@/lib/order-types";
import { useLanguage } from "@/components/LanguageProvider";

const TIMES = Array.from({ length: 13 }, (_, i) => `${String(i + 9).padStart(2, "0")}:00`);

const ERROR_EN: Record<string, string> = {
  "تعذر تحميل الأسعار وإعدادات الطلب الحالية. حاول تحديث الصفحة.": "Could not load current prices and order settings. Please refresh the page.",
  "تعذر رفع الصورة.": "Could not upload the image.",
  "تعذر إرسال الطلب الجماعي.": "Could not submit the group order.",
  "تعذر رفع ملف Excel.": "Could not upload the Excel file.",
  "تعذر رفع الشعار.": "Could not upload the logo.",
  "استقبال الطلبات متوقف مؤقتًا.": "Order submissions are temporarily paused.",
  "طلبات الشراء متوقفة مؤقتًا.": "Purchase orders are temporarily paused.",
  "طلبات الكراء متوقفة مؤقتًا.": "Rental orders are temporarily paused.",
  "الحد الأدنى للطلب الجماعي هو 5 أشخاص.": "The minimum group order is 5 people.",
  "للطلبات التي تتجاوز 100 شخص، يرجى التواصل معنا عبر WhatsApp.": "For orders above 100 people, please contact us on WhatsApp.",
  "خيار الوشاح والقبعة فقط متاح للشراء وليس للكراء.": "The shawl-and-cap-only option is available for purchase, not rental.",
  "أدخل اسم المسؤول عن الطلب.": "Enter the group coordinator’s name.",
  "أدخل رقم هاتف مغربي صحيح.": "Enter a valid Moroccan phone number.",
  "اختر المدينة.": "Choose a city.",
  "اختر نوع القماش.": "Choose a fabric.",
  "أدخل لون الوشاح بشكل صحيح.": "Enter a valid shawl colour.",
  "أدخل عنوان التوصيل.": "Enter the delivery address.",
  "اختر موعد الطلب.": "Choose an order date.",
  "موعد الطلب غير صالح.": "The selected order date or time is invalid.",
  "ملف Excel المرفق غير صالح. أعد رفع الملف.": "The attached Excel file is invalid. Please upload it again.",
  "أدخل اسمًا لكل فرد أو أرفق ملف Excel يحتوي على أسماء المجموعة.": "Enter a name for each member or attach an Excel file containing the group names.",
  "أحد أسماء الأفراد أطول من المسموح.": "One of the member names is too long.",
  "المنتج المحدد غير متاح حاليًا.": "The selected product is currently unavailable.",
  "مدينة التوصيل المحددة غير متاحة حاليًا.": "Delivery is not available in the selected city.",
  "اختر نوع الطباعة لكل موضع تم تفعيله.": "Choose a printing type for each enabled position.",
  "أدخل نص الطباعة المطلوب بشكل صحيح.": "Enter valid text for printing.",
  "ارفع شعارًا صالحًا للطباعة.": "Upload a valid logo for printing.",
  "يمكن رفع حتى 8 صور مرجعية صالحة.": "You can upload up to 8 valid reference images."
};


const initial: GroupOrderDraft = {
  orderType: "شراء",
  quantity: 5,
  responsibleName: "",
  phoneNumber: "",
  city: "Fes",
  deliveryMethod: "homeDelivery",
  address: "",
  deliveryDate: "",
  deliveryTime: "12:00",
  members: Array(5).fill(""),
  productType: "fullOutfit",
  fabric: "ساتان",
  shawlColor: "ذهبي",
  rightShawl: { enabled: false, type: "", text: "", logoPath: null },
  leftShawl: { enabled: false, type: "", text: "", logoPath: null },
  backShawl: { enabled: false, type: "", text: "", logoPath: null },
  cap: { enabled: false, type: "", text: "", logoPath: null },
  referenceImages: [],
  notes: "",
};

export default function GroupOrderClient() {
  const { isArabic } = useLanguage();
  const tr = useCallback((ar: string, en: string) => isArabic ? ar : en, [isArabic]);
  const [draft, setDraft] = useState<GroupOrderDraft>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [excelFile, setExcelFile] = useState<{ name: string; url: string } | null>(null);
  const [expandedPrinting, setExpandedPrinting] = useState<"rightShawl" | "leftShawl" | "backShawl" | "cap" | null>(null);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [cities, setCities] = useState<DeliveryCity[]>(DEFAULT_CITIES);
  const [shop, setShop] = useState<ShopSettings>(DEFAULT_SHOP);
  const [rules, setRules] = useState<OrderRules>(DEFAULT_RULES);
  const [loadingPricing, setLoadingPricing] = useState(true);

  useEffect(() => {
    Promise.all([loadProducts(), loadDeliveryCities(), loadShopSettings(), loadOrderRules()])
      .then(([nextProducts, nextCities, nextShop, nextRules]) => {
        setProducts(nextProducts);
        setCities(nextCities);
        setShop(nextShop);
        setRules(nextRules);
      })
      .catch(() => setMessage(tr("تعذر تحميل الأسعار وإعدادات الطلب الحالية. حاول تحديث الصفحة.", "Could not load current prices and order settings. Please refresh the page.")))
      .finally(() => setLoadingPricing(false));
  }, [tr]);

  const minDate = useMemo(() => {
    const now = DateTime.now().setZone("Africa/Casablanca");
    const minimum = draft.orderType === "شراء"
      ? now.plus({ days: rules.purchasePreparationDays })
      : now.plus({ hours: rules.rentalAdvanceHours });
    return minimum.plus({ days: 1 }).toFormat("yyyy-MM-dd");
  }, [draft.orderType, rules]);

  const priceEstimate = useMemo(() => {
    const selectedType = draft.orderType === "كراء" ? "fullOutfit" : draft.productType;
    const product = products.find((item) => item.productType === selectedType);
    if (!product) return null;
    const baseUnit = draft.orderType === "شراء"
      ? (draft.fabric === "ساتان" ? product.purchaseSatin : product.purchaseMoubara)
      : (draft.fabric === "ساتان" ? product.rentalSatin : product.rentalMoubara);
    if (baseUnit <= 0) return null;
    const shawlPrint = draft.orderType === "شراء" && (draft.rightShawl.enabled || draft.leftShawl.enabled || draft.backShawl.enabled);
    const capPrint = draft.orderType === "شراء" && draft.cap.enabled;
    const unit = baseUnit + (shawlPrint ? 40 : 0) + (capPrint ? 40 : 0);
    const city = cities.find((item) => item.name === draft.city && item.active);
    if (draft.deliveryMethod === "homeDelivery" && !city) return null;
    const delivery = draft.deliveryMethod === "pickup" ? 0 : (city?.price ?? 0);
    const productsTotal = unit * draft.quantity;
    return { unit, productsTotal, delivery, total: productsTotal + delivery };
  }, [products, cities, draft]);

  function changeQuantity(value: number) {
    const quantity = Math.max(5, Math.trunc(value || 5));
    setDraft((d) => ({
      ...d,
      quantity,
      members: d.orderType === "شراء"
        ? Array.from({ length: Math.min(quantity, 100) }, (_, i) => d.members[i] ?? "")
        : [],
    }));
  }

  function patchPrinting(key: "rightShawl" | "leftShawl" | "backShawl" | "cap", next: Partial<GroupPrintingOption>) {
    setDraft((d) => ({ ...d, [key]: { ...d[key], ...next } }));
  }

  async function addReference(file?: File) {
    if (!file || draft.referenceImages.length >= 8) return;
    setUploading(true);
    setMessage("");
    try {
      const url = await uploadGraduationImage(file);
      setDraft((d) => ({ ...d, referenceImages: [...d.referenceImages, url].slice(0, 8) }));
    } catch (error) {
      setMessage(error instanceof Error ? (isArabic ? error.message : ERROR_EN[error.message] ?? error.message) : tr("تعذر رفع الصورة.", "Could not upload the image."));
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const number = await submitGroupOrder({ ...draft, membersExcelUrl: excelFile?.url ?? null, membersExcelName: excelFile?.name ?? null });
      setSuccess(number);
    } catch (error) {
      setMessage(error instanceof Error ? (isArabic ? error.message : ERROR_EN[error.message] ?? error.message) : tr("تعذر إرسال الطلب الجماعي.", "Could not submit the group order."));
    } finally {
      setSubmitting(false);
    }
  }

  if (draft.quantity > 100) {
    return (
      <div className="groupOverLimit" role="status">
        <span className="eyebrow">{tr("طلبات المجموعات الكبيرة", "Large group orders")}</span>
        <h2>{tr("للطلبات التي تتجاوز 100 شخص", "For orders above 100 people")}</h2>
        <p>{tr("حتى ننسق احتياجات مجموعتكم بدقة، تواصل معنا مباشرة عبر WhatsApp وسنتابع معك تفاصيل الكمية والتصميم.", "To coordinate your group’s needs accurately, contact us on WhatsApp to discuss the quantity and design.")}</p>
        <a className="submitOrder" href={`https://wa.me/212717208919?text=${encodeURIComponent(`${isArabic ? "السلام عليكم، أود تنسيق طلب جماعي يتجاوز 100 شخص." : "Hello, I would like to arrange a group order for more than 100 people."} ${isArabic ? "العدد المطلوب:" : "Quantity:"} ${draft.quantity}`) }`} target="_blank" rel="noopener noreferrer">{tr("تواصل معنا عبر WhatsApp", "Contact us on WhatsApp")}</a>
        <button type="button" className="choice" onClick={() => changeQuantity(100)}>{tr("العودة إلى 100 شخص أو أقل", "Return to 100 people or fewer")}</button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="orderSuccess">
        <span className="successMark">✓</span>
        <h2>{tr("تم استلام الطلب الجماعي", "Your group order has been received")}</h2>
        <p>{tr("احتفظ برقم الطلب لتتبعه لاحقًا، ويمكنك مشاركته مع أفراد المجموعة.", "Keep your order number to track it later and share it with your group.")}</p>
        <strong dir="ltr">{success}</strong>
        <a className="primaryButton" href="/track-order">{tr("تتبع الطلب الجماعي", "Track group order")}</a>
      </div>
    );
  }

  return (
    <form className="orderForm" onSubmit={submit}>
      {message && <p className="formError">{message}</p>}
      {(shop.maintenanceMode || !shop.acceptingOrders || (draft.orderType === "شراء" && !shop.purchaseEnabled) || (draft.orderType === "كراء" && !shop.rentalEnabled)) && (
        <p className="formNotice" role="status">{tr("استقبال هذا النوع من الطلبات متوقف مؤقتًا. يرجى التواصل معنا لمعرفة موعد إعادة فتح الطلبات.", "This type of order is temporarily unavailable. Contact us to ask when orders will reopen.")}</p>
      )}

      <section className="formSection">
        <h2>{tr("1. نوع الطلب الجماعي", "1. Group order type")}</h2>
        <div className="choiceGrid">
          {(["شراء","كراء"] as const).map((type) => (
            <button
              type="button"
              key={type}
              disabled={uploading}
              className={draft.orderType === type ? "choice active" : "choice"}
              onClick={() => setDraft((d) => ({
                ...d,
                orderType: type,
                productType: type === "كراء" ? "fullOutfit" : d.productType,
                rightShawl: type === "كراء" ? { enabled: false, type: "", text: "", logoPath: null } : d.rightShawl,
                leftShawl: type === "كراء" ? { enabled: false, type: "", text: "", logoPath: null } : d.leftShawl,
                backShawl: type === "كراء" ? { enabled: false, type: "", text: "", logoPath: null } : d.backShawl,
                cap: type === "كراء" ? { enabled: false, type: "", text: "", logoPath: null } : d.cap,
                referenceImages: type === "كراء" ? [] : d.referenceImages,
                members: type === "شراء"
                  ? Array.from({ length: d.quantity }, (_, i) => d.members[i] ?? "")
                  : [],
              }))}
            >
              {tr(type, type === "شراء" ? "Purchase" : "Rental")}
            </button>
          ))}
        </div>
      </section>

      <section className="formSection">
        <h2>{tr("2. المجموعة", "2. Group details")}</h2>
        <div className="fieldGrid">
          <label>
            {tr("عدد الأفراد", "Number of people")}
            <input
              type="number"
              min={5}
              value={draft.quantity}
              onChange={(e) => changeQuantity(Number(e.target.value))}
              required
            />
          </label>
          <label>
            {tr("اسم المسؤول", "Group coordinator’s name")}
            <input
              value={draft.responsibleName}
              onChange={(e) => setDraft((d) => ({ ...d, responsibleName: e.target.value }))}
              maxLength={120}
              required
            />
          </label>
          <label>
            {tr("رقم الهاتف", "Phone number")}
            <input
              value={draft.phoneNumber}
              onChange={(e) => setDraft((d) => ({ ...d, phoneNumber: e.target.value }))}
              inputMode="tel"
              placeholder="06XXXXXXXX"
              maxLength={10}
              required
              dir="ltr"
            />
          </label>
        </div>
      </section>

      {draft.orderType === "شراء" && (
        <section className="formSection">
          <h2>{tr("3. المنتج", "3. Product")}</h2>
          <p className="sectionHint">{tr("اختر ما سيتم توفيره لجميع أفراد المجموعة.", "Choose what will be supplied to every group member.")}</p>
          <div className="choiceGrid">
            <button type="button" className={draft.productType === "fullOutfit" ? "choice active" : "choice"}
              onClick={() => setDraft((d) => ({ ...d, productType: "fullOutfit" }))}>{tr("بدلة تخرج كاملة", "Full graduation outfit")}</button>
            <button type="button" className={draft.productType === "shawlAndCap" ? "choice active" : "choice"}
              onClick={() => setDraft((d) => ({ ...d, productType: "shawlAndCap" }))}>{tr("وشاح وقبعة فقط دون البدلة", "Shawl and cap only")}</button>
          </div>
        </section>
      )}

      <section className="formSection">
        <h2>{tr("مواصفات الثوب", "Outfit specifications")}</h2>
        <p className="sectionHint">{tr("اختر نوع القماش ولون الوشاح الموحد لجميع أفراد المجموعة.", "Choose the fabric and the shawl colour to be used for the whole group.")}</p>
        <div className="fieldGrid">
          <label>
            نوع القماش
            <select value={draft.fabric} onChange={(e) => setDraft((d) => ({ ...d, fabric: e.target.value as GroupOrderDraft["fabric"] }))}>
              <option value="ساتان">{tr("ساتان", "Satin")}</option>
              <option value="موبرة">{tr("موبرة", "Velvet")}</option>
            </select>
          </label>
          <label>
            لون الوشاح
            <input value={!isArabic && draft.shawlColor === "ذهبي" ? "Gold" : draft.shawlColor} onChange={(e) => setDraft((d) => ({ ...d, shawlColor: e.target.value }))} maxLength={80} required />
          </label>
        </div>
      </section>

      {draft.orderType === "شراء" && (
        <section className="formSection">
          <h2>{tr("4. أسماء أفراد المجموعة", "4. Group members’ names")}</h2>
          <p className="sectionHint">{tr("يمكنك كتابة الأسماء يدويًا أو إرفاق ملف Excel يحتوي على اسم كل فرد في سطر مستقل. اختر طريقة واحدة فقط.", "Enter the names manually or attach an Excel file with one member per row. Choose one method only.")}</p>
          <div className="referenceBox">
            <h3>{tr("إرفاق ملف Excel (اختياري)", "Attach an Excel file (optional)")}</h3>
            <p>{tr("الصيغ المقبولة: .xlsx أو .xls أو .csv — بحد أقصى 10 MB. يجب أن يحتوي الملف على أسماء جميع أفراد المجموعة.", "Accepted formats: .xlsx, .xls or .csv — maximum 10 MB. The file must include every group member’s name.")}</p>
            {excelFile ? (
              <div className="groupExcelAttached">
                <span>✓ {tr("تم إرفاق الملف:", "File attached:")} <strong>{excelFile.name}</strong><small>{tr("خانات الأسماء اليدوية مخفية مؤقتًا", "Manual name fields are hidden while the file is attached.")}</small></span>
                <button type="button" className="choice" onClick={() => setExcelFile(null)}>{tr("حذف الملف والعودة إلى كتابة الأسماء", "Remove file and enter names manually")}</button>
              </div>
            ) : (
              <label className={uploading ? "customUpload isDisabled" : "customUpload referenceUpload"}>
                <input type="file" accept=".xlsx,.xls,.csv" disabled={uploading}
                  onChange={(e) => {
                    const input = e.currentTarget;
                    void (async () => {
                      const file = input.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      setMessage("");
                      try {
                        const url = await uploadGroupExcel(file);
                        setExcelFile({ name: file.name, url });
                      } catch (error) {
                        setMessage(error instanceof Error ? (isArabic ? error.message : ERROR_EN[error.message] ?? error.message) : tr("تعذر رفع ملف Excel.", "Could not upload the Excel file."));
                      } finally {
                        setUploading(false);
                        input.value = "";
                      }
                    })();
                  }} />
                <span className="uploadIcon">↑</span>
                <span>{uploading ? tr("جاري رفع الملف…", "Uploading file…") : tr("اختيار ملف Excel", "Choose Excel file")}</span>
              </label>
            )}
          </div>
          {!excelFile && (
            <>
              <p className="sectionHint">{tr("أو اكتب أسماء الأفراد هنا، ويجب أن يطابق عددها عدد أفراد الطلب.", "Or enter the names below. The number of names must match the order quantity.")}</p>
              <div className="membersGrid">
                {draft.members.map((member, index) => (
                  <label key={index}>
                    {tr("الفرد", "Member")} {index + 1}
                    <input value={member}
                      onChange={(e) => setDraft((d) => {
                        const members = [...d.members];
                        members[index] = e.target.value;
                        return { ...d, members };
                      })}
                      maxLength={120} required />
                  </label>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {draft.orderType === "شراء" && (
        <section className="formSection">
          <h2>{tr("5. تخصيص الطباعة للمجموعة", "5. Group printing customization")}</h2>
          <p className="sectionHint">{tr("خصص نموذجًا واحدًا فقط هنا؛ سيتم اعتماد التصميم والاختيارات نفسها وتعميمها على جميع أفراد المجموعة. هذه الخيارات متاحة للشراء فقط.", "Set up one sample design here. The same design and choices will be applied to every member. Printing is available for purchases only.")}</p>
          <div className="printingGrid">
            {([
              ["rightShawl", "الجانب الأيمن من الوشاح"],
              ["leftShawl", "الجانب الأيسر من الوشاح"],
              ["backShawl", "ظهر الوشاح"],
              ["cap", "القبعة"],
            ] as const).map(([key, label]) => {
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
                    {option.enabled && <button className="printingExpand" type="button"
                      aria-expanded={expandedPrinting === key}
                      onClick={() => setExpandedPrinting((current) => current === key ? null : key)}>
                      {expandedPrinting === key ? tr("إغلاق", "Close") : tr("تعديل", "Edit")}
                    </button>}
                  </div>
                  {option.enabled && expandedPrinting === key && (
                    <div className="printingDetails">
                      <label>{tr("نوع الطباعة", "Printing type")}
                        <select value={option.type} onChange={(e) => patchPrinting(key, { type: e.target.value as GroupPrintingOption["type"] })}>
                          <option value="text">{tr("نص", "Text")}</option><option value="logo">{tr("شعار", "Logo")}</option><option value="both">{tr("نص + شعار", "Text + logo")}</option>
                        </select>
                      </label>
                      {(option.type === "text" || option.type === "both") && (
                        <label>{tr("النص المطلوب", "Text to print")}
                          <input maxLength={500} value={option.text} onChange={(e) => patchPrinting(key, { text: e.target.value })} />
                        </label>
                      )}
                      {(option.type === "logo" || option.type === "both") && (
                        <div className="uploadField">
                          <span className="uploadLabel">{tr("رفع الشعار", "Upload logo")}</span>
                          <label className={uploading ? "customUpload isDisabled" : "customUpload"}>
                            <input type="file" accept="image/*" disabled={uploading}
                              onChange={(e) => { void (async () => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploading(true);
                                try { const url = await uploadGraduationImage(file); patchPrinting(key, { logoPath: url }); }
                                catch (error) { setMessage(error instanceof Error ? (isArabic ? error.message : ERROR_EN[error.message] ?? error.message) : tr("تعذر رفع الشعار.", "Could not upload the logo.")); }
                                finally { setUploading(false); }
                              })(); }} />
                            <span className="uploadIcon">↑</span><span>{option.logoPath ? tr("استبدال الشعار", "Replace logo") : tr("اختر صورة الشعار", "Choose logo image")}</span>
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
            <h3>{tr("صور مرجعية للتصميم", "Design reference images")}</h3>
            <p>{tr("ارفع حتى 8 صور توضح الشكل المطلوب، وستكون مرجعًا موحدًا لتنفيذ المجموعة.", "Upload up to 8 images showing the requested design. They will be used as a shared reference for the group.")}</p>
            <label className={(uploading || draft.referenceImages.length >= 8) ? "customUpload referenceUpload isDisabled" : "customUpload referenceUpload"}>
              <input type="file" accept="image/*" disabled={uploading || draft.referenceImages.length >= 8}
                onChange={(e) => { void addReference(e.target.files?.[0]); e.currentTarget.value = ""; }} />
              <span className="uploadIcon">↑</span>
              <span>{uploading ? tr("جاري رفع الصورة…", "Uploading image…") : draft.referenceImages.length >= 8 ? tr("تم رفع الحد الأقصى", "Maximum reached") : tr("إضافة صورة", "Add image")}</span>
              <strong>{draft.referenceImages.length}/8</strong>
            </label>
            {draft.referenceImages.length > 0 && (
              <div className="referenceList">
                {draft.referenceImages.map((url, index) => (
                  <div className="groupReferenceItem" key={url}>
                    <a href={url} target="_blank" rel="noopener noreferrer"><Image src={url} alt={`${tr("الصورة المرجعية", "Reference image")} ${index + 1}`} width={96} height={96} unoptimized />{tr("عرض الصورة", "View image")} {index + 1}</a>
                    <button type="button" onClick={() => setDraft((d) => ({ ...d, referenceImages: d.referenceImages.filter((_, i) => i !== index) }))}>{tr("حذف ×", "Remove ×")}</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="formSection">
        <h2>{draft.orderType === "شراء" ? "6" : "3"}. {tr("الاستلام والتوصيل", "Collection and delivery")}</h2>
        <div className="choiceGrid">
          <button
            type="button"
            className={draft.deliveryMethod === "homeDelivery" ? "choice active" : "choice"}
            onClick={() => setDraft((d) => ({ ...d, deliveryMethod: "homeDelivery" }))}
          >
            {tr("توصيل للمنزل", "Home delivery")}
          </button>
          <button
            type="button"
            className={draft.deliveryMethod === "pickup" ? "choice active" : "choice"}
            onClick={() => setDraft((d) => ({ ...d, deliveryMethod: "pickup", city: "Fes", address: "" }))}
          >
            {tr("الاستلام", "Pickup")}
          </button>
        </div>

        <div className="fieldGrid">
          <label>
            {tr("المدينة", "City")}
            <select
              value={draft.city}
              disabled={draft.deliveryMethod === "pickup"}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
            >
              {cities.filter((city) => city.active).map((city) => <option key={city.id} value={city.name}>{city.name}</option>)}
            </select>
          </label>

          {draft.deliveryMethod === "homeDelivery" && (
            <label>
              {tr("العنوان", "Address")}
              <input
                value={draft.address}
                onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                maxLength={500}
                required
              />
            </label>
          )}

          <label>
            تاريخ {tr("الاستلام", "Pickup")}
            <input
              type="date"
              min={minDate}
              value={draft.deliveryDate}
              onChange={(e) => setDraft((d) => ({ ...d, deliveryDate: e.target.value }))}
              required
            />
          </label>

          <label>
            {tr("الوقت", "Time")}
            <select
              value={draft.deliveryTime}
              onChange={(e) => setDraft((d) => ({ ...d, deliveryTime: e.target.value }))}
            >
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
            <p>{tr("مدة الكراء 24 ساعة كاملة من وقت الاستلام. راجع الموعد أعلاه قبل إرسال الطلب. لا تُطلب أسماء الأفراد أو خيارات الطباعة في الكراء.", "The rental period is 24 hours from collection. Check the return time above before submitting. Member names and printing options are not required for rentals.")}</p>
          </div>
        )}
      </section>

      <section className="formSection">
        <h2>{draft.orderType === "شراء" ? "7" : "4"}. {tr("ملاحظات", "Notes")}</h2>
        <textarea
          rows={4}
          maxLength={2000}
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          placeholder={tr("أي تفاصيل إضافية عن المجموعة أو المناسبة", "Any additional details about the group or event")}
        />
      </section>

      {priceEstimate && (
        <aside className="orderSummary" aria-live="polite">
          <div><span>{tr("سعر الفرد الواحد", "Price per person")}</span><strong>{priceEstimate.unit} {tr("درهم", "MAD")}</strong></div>
          <div><span>{tr("مجموع المنتجات", "Products subtotal")} ({draft.quantity} {tr("أفراد", "people")})</span><strong>{priceEstimate.productsTotal} {tr("درهم", "MAD")}</strong></div>
          <div><span>{tr("التوصيل", "Delivery")}</span><strong>{priceEstimate.delivery} {tr("درهم", "MAD")}</strong></div>
          <div className="summaryTotal"><span>{tr("التقدير الإجمالي للمجموعة", "Estimated group total")}</span><strong>{priceEstimate.total} {tr("درهم", "MAD")}</strong></div>
          <p className="sectionHint">{tr("تقدير وفق الأسعار الحالية للمنتجات ورسوم التوصيل، دون خصم كميات. يُؤكد السعر النهائي بعد مراجعة الطلب.", "Estimate based on current product prices and delivery fees, with no group discount. The final price will be confirmed after reviewing the order.")}</p>
        </aside>
      )}
      {loadingPricing && <p className="formNotice">{tr("جاري تحميل الأسعار الحالية…", "Loading current prices…")}</p>}
      {!loadingPricing && !priceEstimate && <p className="formError">{tr("تعذر احتساب السعر حاليًا. تحقق من اختيار المنتج والمدينة أو أعد تحميل الصفحة.", "The price cannot be calculated right now. Check the selected product and city, or refresh the page.")}</p>}

      <button className="submitOrder" type="submit" disabled={submitting || uploading || loadingPricing || !priceEstimate || shop.maintenanceMode || !shop.acceptingOrders || (draft.orderType === "شراء" && !shop.purchaseEnabled) || (draft.orderType === "كراء" && !shop.rentalEnabled)}>
        {submitting ? tr("جاري إرسال الطلب…", "Submitting order…") : tr("إرسال الطلب الجماعي", "Submit group order")}
      </button>
      <p className="privacyNote">{tr("لا يحتاج أي فرد من المجموعة إلى إنشاء حساب.", "No group member needs to create an account.")}</p>
    </form>
  );
}
