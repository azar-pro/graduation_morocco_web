"use client";

import Image from "next/image";

import { FormEvent, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { submitGroupOrder, type GroupOrderDraft, type GroupPrintingOption } from "@/lib/group-orders";
import { uploadGraduationImage } from "@/lib/image-upload";
import { uploadGroupExcel } from "@/lib/group-file-upload";

const TIMES = Array.from({ length: 13 }, (_, i) => `${String(i + 9).padStart(2, "0")}:00`);
const CITIES = ["Fes","Meknes","Sefrou","Ifrane","El Hajeb","Taza","Rabat","Casablanca","Marrakech","Tangier","Agadir","Oujda","Tetouan","Nador"];

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
  const [draft, setDraft] = useState<GroupOrderDraft>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [excelFile, setExcelFile] = useState<{ name: string; url: string } | null>(null);
  const [expandedPrinting, setExpandedPrinting] = useState<"rightShawl" | "leftShawl" | "backShawl" | "cap" | null>(null);

  const minDate = useMemo(
    () => DateTime.now().setZone("Africa/Casablanca").plus({ days: 2 }).toFormat("yyyy-MM-dd"),
    [],
  );

  function changeQuantity(value: number) {
    const quantity = Math.min(100, Math.max(5, Math.trunc(Number.isFinite(value) ? value : 5)));
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
      setMessage(error instanceof Error ? error.message : "تعذر رفع الصورة.");
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
      setMessage(error instanceof Error ? error.message : "تعذر إرسال الطلب الجماعي.");
    } finally {
      setSubmitting(false);
    }
  }

  if (draft.quantity > 100) {
    return (
      <div className="groupOverLimit" role="status">
        <span className="eyebrow">طلبات المجموعات الكبيرة</span>
        <h2>للطلبات التي تتجاوز 100 شخص</h2>
        <p>حتى ننسق احتياجات مجموعتكم بدقة، تواصل معنا مباشرة عبر WhatsApp وسنتابع معك تفاصيل الكمية والتصميم.</p>
        <a className="submitOrder" href={`https://wa.me/212717208919?text=${encodeURIComponent(`السلام عليكم، أود تنسيق طلب جماعي يتجاوز 100 شخص. العدد المطلوب: ${draft.quantity}`) }`} target="_blank" rel="noopener noreferrer">تواصل معنا عبر WhatsApp</a>
        <button type="button" className="choice" onClick={() => changeQuantity(100)}>العودة إلى 100 شخص أو أقل</button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="orderSuccess">
        <span className="successMark">✓</span>
        <h2>تم استلام الطلب الجماعي</h2>
        <p>احتفظ برقم الطلب وشاركه مع المسؤول عن المجموعة.</p>
        <strong dir="ltr">{success}</strong>
      </div>
    );
  }

  return (
    <form className="orderForm" onSubmit={submit}>
      {message && <p className="formError">{message}</p>}

      <section className="formSection">
        <h2>1. نوع الطلب الجماعي</h2>
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
              {type}
            </button>
          ))}
        </div>
      </section>

      <section className="formSection">
        <h2>2. المجموعة</h2>
        <div className="fieldGrid">
          <label>
            عدد الأفراد
            <input
              type="number"
              min={5}
              max={100}
              step={1}
              value={draft.quantity}
              onChange={(e) => changeQuantity(Number(e.target.value))}
              required
            />
          </label>
          <label>
            اسم المسؤول
            <input
              value={draft.responsibleName}
              onChange={(e) => setDraft((d) => ({ ...d, responsibleName: e.target.value }))}
              maxLength={120}
              required
            />
          </label>
          <label>
            رقم الهاتف
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

      <section className="formSection">
        <h2>3. المنتج</h2>
        <p className="sectionHint">اختر القماش ولون الوشاح لجميع أفراد المجموعة.</p>
        {draft.orderType === "شراء" && (
          <div className="choiceGrid">
            <button type="button" className={draft.productType === "fullOutfit" ? "choice active" : "choice"}
              onClick={() => setDraft((d) => ({ ...d, productType: "fullOutfit" }))}>بدلة تخرج كاملة</button>
            <button type="button" className={draft.productType === "shawlAndCap" ? "choice active" : "choice"}
              onClick={() => setDraft((d) => ({ ...d, productType: "shawlAndCap" }))}>وشاح وقبعة فقط دون البدلة</button>
          </div>
        )}
        <div className="fieldGrid">
          <label>القماش
            <select value={draft.fabric} onChange={(e) => setDraft((d) => ({ ...d, fabric: e.target.value as GroupOrderDraft["fabric"] }))}>
              <option value="ساتان">ساتان</option><option value="موبرة">موبرة</option>
            </select>
          </label>
          <label>لون الوشاح
            <input value={draft.shawlColor} onChange={(e) => setDraft((d) => ({ ...d, shawlColor: e.target.value }))} maxLength={80} required />
          </label>
        </div>
      </section>

      {draft.orderType === "شراء" && (
        <section className="formSection">
          <h2>4. أسماء أفراد المجموعة</h2>
          <p className="sectionHint">يمكنك كتابة الأسماء يدويًا أو إرفاق ملف Excel يحتوي على اسم كل فرد في سطر مستقل. اختر طريقة واحدة فقط.</p>
          <div className="referenceBox">
            <h3>إرفاق ملف Excel (اختياري)</h3>
            <p>الصيغ المقبولة: .xlsx أو .xls أو .csv — بحد أقصى 10 MB. يجب أن يحتوي الملف على أسماء جميع أفراد المجموعة.</p>
            {excelFile ? (
              <div className="groupExcelAttached">
                <span>✓ تم إرفاق الملف: <strong>{excelFile.name}</strong></span>
                <button type="button" className="choice" onClick={() => setExcelFile(null)}>إزالة الملف والكتابة يدويًا</button>
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
                        setMessage(error instanceof Error ? error.message : "تعذر رفع ملف Excel.");
                      } finally {
                        setUploading(false);
                        input.value = "";
                      }
                    })();
                  }} />
                <span className="uploadIcon">↑</span>
                <span>{uploading ? "جاري رفع الملف…" : "اختيار ملف Excel"}</span>
              </label>
            )}
          </div>
          {!excelFile && (
            <>
              <p className="sectionHint">أو اكتب أسماء الأفراد هنا، ويجب أن يطابق عددها عدد أفراد الطلب.</p>
              <div className="membersGrid">
                {draft.members.map((member, index) => (
                  <label key={index}>
                    الفرد {index + 1}
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
          <h2>5. تخصيص الطباعة للمجموعة</h2>
          <p className="sectionHint">خصص نموذجًا واحدًا فقط هنا؛ سيتم اعتماد التصميم والاختيارات نفسها وتعميمها على جميع أفراد المجموعة. هذه الخيارات متاحة للشراء فقط.</p>
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
                      <strong>{label}</strong>
                    </label>
                    {option.enabled && <button className="printingExpand" type="button"
                      aria-expanded={expandedPrinting === key}
                      onClick={() => setExpandedPrinting((current) => current === key ? null : key)}>
                      {expandedPrinting === key ? "إغلاق" : "تعديل"}
                    </button>}
                  </div>
                  {option.enabled && expandedPrinting === key && (
                    <div className="printingDetails">
                      <label>نوع الطباعة
                        <select value={option.type} onChange={(e) => patchPrinting(key, { type: e.target.value as GroupPrintingOption["type"] })}>
                          <option value="text">نص</option><option value="logo">شعار</option><option value="both">نص + شعار</option>
                        </select>
                      </label>
                      {(option.type === "text" || option.type === "both") && (
                        <label>النص المطلوب
                          <input maxLength={500} value={option.text} onChange={(e) => patchPrinting(key, { text: e.target.value })} />
                        </label>
                      )}
                      {(option.type === "logo" || option.type === "both") && (
                        <div className="uploadField">
                          <span className="uploadLabel">رفع الشعار</span>
                          <label className={uploading ? "customUpload isDisabled" : "customUpload"}>
                            <input type="file" accept="image/*" disabled={uploading}
                              onChange={(e) => { void (async () => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploading(true);
                                try { const url = await uploadGraduationImage(file); patchPrinting(key, { logoPath: url }); }
                                catch (error) { setMessage(error instanceof Error ? error.message : "تعذر رفع الشعار."); }
                                finally { setUploading(false); }
                              })(); }} />
                            <span className="uploadIcon">↑</span><span>{option.logoPath ? "استبدال الشعار" : "اختر صورة الشعار"}</span>
                          </label>
                          {option.logoPath && <span className="uploadDone">تم رفع الشعار ✓</span>}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <div className="referenceBox">
            <h3>صور مرجعية للتصميم</h3>
            <p>ارفع حتى 8 صور توضح الشكل المطلوب، وستكون مرجعًا موحدًا لتنفيذ المجموعة.</p>
            <label className={(uploading || draft.referenceImages.length >= 8) ? "customUpload referenceUpload isDisabled" : "customUpload referenceUpload"}>
              <input type="file" accept="image/*" disabled={uploading || draft.referenceImages.length >= 8}
                onChange={(e) => { void addReference(e.target.files?.[0]); e.currentTarget.value = ""; }} />
              <span className="uploadIcon">↑</span>
              <span>{uploading ? "جاري رفع الصورة…" : draft.referenceImages.length >= 8 ? "تم رفع الحد الأقصى" : "إضافة صورة"}</span>
              <strong>{draft.referenceImages.length}/8</strong>
            </label>
            {draft.referenceImages.length > 0 && (
              <div className="referenceList">
                {draft.referenceImages.map((url, index) => (
                  <div className="groupReferenceItem" key={url}>
                    <a href={url} target="_blank" rel="noopener noreferrer"><Image src={url} alt={`الصورة المرجعية ${index + 1}`} width={1200} height={900} unoptimized />عرض الصورة {index + 1}</a>
                    <button type="button" onClick={() => setDraft((d) => ({ ...d, referenceImages: d.referenceImages.filter((_, i) => i !== index) }))}>حذف ×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="formSection">
        <h2>{draft.orderType === "شراء" ? "6" : "3"}. الاستلام والتوصيل</h2>
        <div className="choiceGrid">
          <button
            type="button"
            className={draft.deliveryMethod === "homeDelivery" ? "choice active" : "choice"}
            onClick={() => setDraft((d) => ({ ...d, deliveryMethod: "homeDelivery" }))}
          >
            توصيل للمنزل
          </button>
          <button
            type="button"
            className={draft.deliveryMethod === "pickup" ? "choice active" : "choice"}
            onClick={() => setDraft((d) => ({ ...d, deliveryMethod: "pickup", city: "Fes", address: "" }))}
          >
            الاستلام
          </button>
        </div>

        <div className="fieldGrid">
          <label>
            المدينة
            <select
              value={draft.city}
              disabled={draft.deliveryMethod === "pickup"}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
            >
              {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </label>

          {draft.deliveryMethod === "homeDelivery" && (
            <label>
              العنوان
              <input
                value={draft.address}
                onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                maxLength={500}
                required
              />
            </label>
          )}

          <label>
            تاريخ الاستلام
            <input
              type="date"
              min={minDate}
              value={draft.deliveryDate}
              onChange={(e) => setDraft((d) => ({ ...d, deliveryDate: e.target.value }))}
              required
            />
          </label>

          <label>
            الوقت
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
            <strong>موعد إرجاع الكراء</strong>
            {draft.deliveryDate ? (
              <p dir="rtl">
                {DateTime.fromISO(`${draft.deliveryDate}T${draft.deliveryTime}`, { zone: "Africa/Casablanca" })
                  .plus({ hours: 24 }).toFormat("dd/MM/yyyy")} — الساعة{" "}
                {DateTime.fromISO(`${draft.deliveryDate}T${draft.deliveryTime}`, { zone: "Africa/Casablanca" })
                  .plus({ hours: 24 }).toFormat("HH:mm")}
              </p>
            ) : <p>اختر تاريخ ووقت الاستلام لعرض موعد الإرجاع.</p>}
            <p>مدة الكراء 24 ساعة كاملة من وقت الاستلام. راجع الموعد أعلاه قبل إرسال الطلب. لا تُطلب أسماء الأفراد أو خيارات الطباعة في الكراء.</p>
          </div>
        )}
      </section>

      <section className="formSection">
        <h2>{draft.orderType === "شراء" ? "7" : "4"}. ملاحظات</h2>
        <textarea
          rows={4}
          maxLength={2000}
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          placeholder="أي تفاصيل إضافية عن المجموعة أو المناسبة"
        />
      </section>

      <button className="submitOrder" type="submit" disabled={submitting || uploading}>
        {submitting ? "جاري إرسال الطلب…" : "إرسال الطلب الجماعي"}
      </button>
      <p className="privacyNote">لا يحتاج أي فرد من المجموعة إلى إنشاء حساب.</p>
    </form>
  );
}
