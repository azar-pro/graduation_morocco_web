"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminGuard from "../../AdminGuard";
import {
  loadAdminOrder,
  updateOrderPayment,
  updateOrderStatus,
  confirmRentalDepositReceived,
  settleRentalReturn,
  type AdminOrder,
} from "@/lib/admin-data";

const statusLabels: Record<string,string> = {
  received:"تم الاستلام",
  review:"قيد المراجعة",
  working:"جاري التنفيذ",
  printing:"جاري الطباعة",
  ready:"جاهز",
  delivery:"في التوصيل",
  completed:"تم التسليم",
  cancelled:"ملغي",
};

const paymentLabels: Record<string,string> = {
  pending:"غير مدفوع",
  partial:"مدفوع جزئيًا",
  paid:"مدفوع",
};

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `${n.toFixed(n % 1 === 0 ? 0 : 2)} درهم` : "0 درهم";
}

function text(value: unknown) {
  const s = String(value ?? "").trim();
  return s || "—";
}

function AdminOrderDetailContent() {
  const params = useParams<{ orderNumber: string }>();
  const router = useRouter();
  const orderNumber = decodeURIComponent(params.orderNumber);
  const [order,setOrder] = useState<AdminOrder|null>(null);
  const [loading,setLoading] = useState(true);
  const [message,setMessage] = useState("");
  const [saving,setSaving] = useState(false);
  const [damageDeduction,setDamageDeduction] = useState("0");

  async function refresh() {
    setLoading(true);
    setMessage("");
    try {
      setOrder(await loadAdminOrder(orderNumber));
    } catch {
      setMessage("تعذر تحميل تفاصيل الطلب.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminOrder(orderNumber)
      .then(setOrder)
      .catch(() => setMessage("تعذر تحميل تفاصيل الطلب."))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  const printing = useMemo(() => {
    if (!order) return [];
    const keys = [
      ["rightShawl","الجهة اليمنى للوشاح"],
      ["leftShawl","الجهة اليسرى للوشاح"],
      ["backShawl","ظهر الوشاح"],
      ["cap","القبعة"],
    ] as const;
    return keys.map(([key,label]) => ({
      key,
      label,
      value: order[key] as { enabled?: boolean; type?: string; text?: string; logoPath?: string | null } | undefined,
    })).filter((item) => item.value?.enabled === true);
  },[order]);

  async function saveStatus(status: string) {
    if (!order) return;
    setSaving(true);
    try {
      await updateOrderStatus(String(order.orderNumber ?? order.id),status);
      setOrder({...order,status});
    } finally {
      setSaving(false);
    }
  }

  async function savePayment() {
    if (!order) return;
    const amount = window.prompt("المبلغ المحصل حتى الآن", String(order.amountPaid ?? 0));
    if (amount === null) return;
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setMessage("المبلغ غير صالح.");
      return;
    }

    const total = Number(order.totalPrice ?? 0);
    const paymentStatus =
      parsed <= 0 ? "pending" : parsed >= total ? "paid" : "partial";

    setSaving(true);
    try {
      await updateOrderPayment({
        orderNumber: String(order.orderNumber ?? order.id),
        paymentMethod: String(order.paymentMethod ?? "bank_transfer"),
        paymentStatus,
        amountPaid: parsed,
        totalPrice: total,
      });
      await refresh();
    } catch {
      setMessage("تعذر تحديث الدفع.");
    } finally {
      setSaving(false);
    }
  }


  async function confirmRentalDeposit() {
    if (!order) return;
    setSaving(true);
    setMessage("");
    try {
      await confirmRentalDepositReceived(String(order.orderNumber ?? order.id));
      await refresh();
      setMessage("تم تسجيل استلام ضمان الكراء.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تسجيل الضمان.");
    } finally {
      setSaving(false);
    }
  }

  async function settleRental() {
    if (!order) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await settleRentalReturn({
        orderNumber: String(order.orderNumber ?? order.id),
        damageDeduction: Number(damageDeduction),
      });
      await refresh();
      setMessage(`تمت التسوية. المبلغ المعاد: ${money(result.refund)}.` +
        (result.additionalDue > 0 ? ` المبلغ الإضافي المستحق بسبب الضرر: ${money(result.additionalDue)}.` : ""));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذرت تسوية إرجاع الكراء.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="adminCenter"><p>جاري تحميل الطلب…</p></main>;
  if (!order) return <main className="adminCenter"><p>الطلب غير موجود.</p></main>;

  const images = Array.isArray(order.referenceImages)
    ? order.referenceImages.map(String)
    : [];

  return (
        <main className="adminDetailPage">
          <div className="adminDetailTop">
            <button type="button" onClick={() => router.push("/admin")}>العودة</button>
            <div>
              <p className="eyebrow">ORDER DETAILS</p>
              <h1 dir="ltr">{text(order.orderNumber ?? order.id)}</h1>
            </div>
          </div>

          {message && <p className="formError">{message}</p>}

          <section className="adminDetailGrid">
            <article className="adminDetailCard">
              <h2>معلومات الطلب</h2>
              <dl>
                <div><dt>الحالة</dt><dd>
                  <select value={String(order.status ?? "received")} disabled={saving}
                    onChange={(e) => void saveStatus(e.target.value)}>
                    {Object.entries(statusLabels).map(([value,label]) =>
                      <option key={value} value={value}>{label}</option>)}
                  </select>
                </dd></div>
                <div><dt>النوع</dt><dd>{text(order.orderType)}</dd></div>
                <div><dt>المنتج</dt><dd>{text(order.catalogProductNameAr ?? order.productType)}</dd></div>
                <div><dt>القماش</dt><dd>{text(order.fabric)}</dd></div>
                <div><dt>لون الوشاح</dt><dd>{text(order.shawlColor)}</dd></div>
                <div><dt>الإجمالي</dt><dd>{money(order.totalPrice)}</dd></div>
              </dl>
            </article>

            <article className="adminDetailCard">
              <h2>العميل</h2>
              <dl>
                <div><dt>الاسم</dt><dd>{text(order.fullName)}</dd></div>
                <div><dt>الهاتف</dt><dd dir="ltr">{text(order.phoneNumber)}</dd></div>
                <div><dt>المدينة</dt><dd>{text(order.city)}</dd></div>
                <div><dt>العنوان</dt><dd>{text(order.address)}</dd></div>
              </dl>
            </article>

            <article className="adminDetailCard">
              <h2>التوصيل</h2>
              <dl>
                <div><dt>الطريقة</dt><dd>{text(order.deliveryMethod)}</dd></div>
                <div><dt>التاريخ</dt><dd>{text(order.deliveryDate)}</dd></div>
                <div><dt>الوقت</dt><dd>{text(order.deliveryTime)}</dd></div>
                <div><dt>رسوم التوصيل</dt><dd>{money(order.deliveryFee)}</dd></div>
                <div><dt>ملاحظات</dt><dd>{text(order.deliveryNotes)}</dd></div>
              </dl>
            </article>

            <article className="adminDetailCard">
              <h2>الدفع</h2>
              {String(order.orderType) === "كراء" ? (
                <dl>
                  <div><dt>طريقة دفع الضمان</dt><dd>{text(order.paymentMethod)}</dd></div>
                  <div><dt>المبلغ المطلوب عند الاستلام</dt><dd>{money(Number(order.rentalSecurityDepositAmount ?? 0) + Number(order.deliveryFeeApplied ?? 0))}</dd></div>
                  <div><dt>حالة الاستلام</dt><dd>{order.rentalDepositStatus === "collected" ? "تم استلام الضمان ورسوم التوصيل" : "بانتظار استلام الضمان ورسوم التوصيل"}</dd></div>
                  {order.rentalDepositStatus === "collected" && <div><dt>المبلغ المستلم</dt><dd>{money(Number(order.rentalDepositCollectedAmount ?? 0) + Number(order.rentalDeliveryFeeCollectedAmount ?? 0))}</dd></div>}
                </dl>
              ) : (
                <>
                  <dl>
                    <div><dt>الطريقة</dt><dd>{text(order.paymentMethod)}</dd></div>
                    <div><dt>الحالة</dt><dd>{paymentLabels[String(order.paymentStatus ?? "pending")] ?? text(order.paymentStatus)}</dd></div>
                    <div><dt>المحصل</dt><dd>{money(order.amountPaid)}</dd></div>
                    <div><dt>المتبقي</dt><dd>{money(order.remainingAmount)}</dd></div>
                    <div><dt>التسبيق المطلوب</dt><dd>{money(order.depositRequiredAmount)}</dd></div>
                  </dl>
                  <button type="button" className="adminAction" disabled={saving} onClick={() => void savePayment()}>
                    تحديث المبلغ المحصل
                  </button>
                </>
              )}
            </article>
          </section>


          {String(order.orderType) === "كراء" && (
            <section className="adminDetailCard">
              <h2>ضمان الكراء وتسوية الإرجاع</h2>
              <dl>
                <div><dt>سعر الكراء المستحق</dt><dd>{money(order.rentalFeeAmount)}</dd></div>
                <div><dt>الضمان المطلوب</dt><dd>{money(order.rentalSecurityDepositAmount)}</dd></div>
                <div><dt>حالة الضمان</dt><dd>{String(order.rentalDepositStatus ?? "pending") === "collected" ? "تم استلام الضمان" : "لم يتم تسجيل استلام الضمان"}</dd></div>
                <div><dt>حالة الإرجاع</dt><dd>{String(order.rentalReturnStatus ?? "awaiting_return") === "returned" ? "تم إرجاع البدلة" : "بانتظار إرجاع البدلة"}</dd></div>
                {order.rentalReturnStatus === "returned" && <>
                  <div><dt>خصم الضرر</dt><dd>{money(order.rentalDamageDeduction)}</dd></div>
                  <div><dt>المبلغ المعاد للعميل</dt><dd>{money(order.rentalRefundAmount)}</dd></div>
                  {Number(order.rentalAdditionalDamageDue ?? 0) > 0 && <div><dt>مبلغ إضافي مستحق بسبب الضرر</dt><dd>{money(order.rentalAdditionalDamageDue)}</dd></div>}
                </>}
              </dl>
              {order.rentalDepositStatus !== "collected" && (
                <div className="formNotice">
                  <p>بعد التحقق من وصول مبلغ الضمان فعليًا، سجّل استلامه هنا.</p>
                  <button type="button" className="adminAction" disabled={saving} onClick={() => void confirmRentalDeposit()}>
                    تأكيد استلام الضمان ورسوم التوصيل ({money(Number(order.rentalSecurityDepositAmount ?? 0) + Number(order.deliveryFeeApplied ?? 0))})
                  </button>
                </div>
              )}
              {order.rentalDepositStatus === "collected" && order.rentalReturnStatus !== "returned" && (
                <div className="fieldGrid">
                  <label>خصم الضرر (درهم)
                    <input type="number" min="0" step="1" value={damageDeduction} onChange={e=>setDamageDeduction(e.target.value)} disabled={saving}/>
                  </label>
                  <div>
                    <p className="sectionHint">سيُخصم سعر الكراء تلقائيًا، ثم خصم الضرر الذي تدخله، ويُحسب المبلغ المتبقي لإعادته للعميل.</p>
                    <button type="button" className="adminAction" disabled={saving || !Number.isFinite(Number(damageDeduction)) || Number(damageDeduction) < 0} onClick={() => void settleRental()}>
                      تأكيد الإرجاع وحساب المبلغ المعاد
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="adminDetailCard">
            <h2>الطباعة والتخصيص</h2>
            {printing.length === 0 ? <p>لا توجد طباعة مخصصة.</p> : (
              <div className="printingAdminList">
                {printing.map((item) => (
                  <article key={item.key}>
                    <strong>{item.label}</strong>
                    <span>النوع: {text(item.value?.type)}</span>
                    <span>النص: {text(item.value?.text)}</span>
                    {item.value?.logoPath && (
                      <a href={String(item.value.logoPath)} target="_blank" rel="noreferrer">فتح الشعار</a>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="adminDetailCard">
            <h2>الصور المرجعية</h2>
            {images.length === 0 ? <p>لا توجد صور.</p> : (
              <div className="adminImages">
                {images.map((url) => (
                  <a href={url} target="_blank" rel="noreferrer" key={url}>
                    <img src={url} alt="صورة مرجعية للطلب" />
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className="adminDetailCard">
            <h2>ملاحظات الطلب</h2>
            <p>{text(order.notes)}</p>
          </section>
        </main>
  );
}

export default function AdminOrderDetailClient() {
  return <AdminGuard>{() => <AdminOrderDetailContent />}</AdminGuard>;
}
