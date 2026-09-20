"use client";

import { FormEvent, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { submitGroupOrder, type GroupOrderDraft } from "@/lib/group-orders";

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
  notes: "",
};

export default function GroupOrderClient() {
  const [draft, setDraft] = useState<GroupOrderDraft>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const minDate = useMemo(
    () => DateTime.now().setZone("Africa/Casablanca").plus({ days: 2 }).toFormat("yyyy-MM-dd"),
    [],
  );

  function changeQuantity(value: number) {
    const quantity = Math.max(5, Math.min(100, Math.trunc(value || 5)));
    setDraft((d) => ({
      ...d,
      quantity,
      members: d.orderType === "شراء"
        ? Array.from({ length: quantity }, (_, i) => d.members[i] ?? "")
        : [],
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const number = await submitGroupOrder(draft);
      setSuccess(number);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إرسال الطلب الجماعي.");
    } finally {
      setSubmitting(false);
    }
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
              className={draft.orderType === type ? "choice active" : "choice"}
              onClick={() => setDraft((d) => ({
                ...d,
                orderType: type,
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

      {draft.orderType === "شراء" && (
        <section className="formSection">
          <h2>3. أسماء أفراد المجموعة</h2>
          <p className="sectionHint">أدخل اسمًا لكل فرد. يجب أن يطابق عدد الأسماء عدد أفراد الطلب.</p>
          <div className="membersGrid">
            {draft.members.map((member, index) => (
              <label key={index}>
                الفرد {index + 1}
                <input
                  value={member}
                  onChange={(e) => setDraft((d) => {
                    const members = [...d.members];
                    members[index] = e.target.value;
                    return { ...d, members };
                  })}
                  maxLength={120}
                  required
                />
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="formSection">
        <h2>{draft.orderType === "شراء" ? "4" : "3"}. الاستلام والتوصيل</h2>
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
          <p className="formNotice">مدة الكراء الحالية 24 ساعة من وقت الاستلام، ولا يتم إدخال أسماء الأفراد أو الطباعة في طلب الكراء.</p>
        )}
      </section>

      <section className="formSection">
        <h2>{draft.orderType === "شراء" ? "5" : "4"}. ملاحظات</h2>
        <textarea
          rows={4}
          maxLength={2000}
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          placeholder="أي تفاصيل إضافية عن المجموعة أو المناسبة"
        />
      </section>

      <button className="submitOrder" type="submit" disabled={submitting}>
        {submitting ? "جاري إرسال الطلب…" : "إرسال الطلب الجماعي"}
      </button>
      <p className="privacyNote">لا يحتاج أي فرد من المجموعة إلى إنشاء حساب.</p>
    </form>
  );
}
