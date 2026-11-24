"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminGuard from "../../AdminGuard";
import {
  loadAdminGroupOrder,
  updateGroupOrderStatus,
  confirmGroupRentalDepositReceived,
  settleGroupRentalReturn,
  type AdminGroupOrder,
} from "@/lib/admin-data";

const labels: Record<string,string> = {
  received:"تم الاستلام",
  review:"قيد المراجعة",
  working:"جاري التنفيذ",
  printing:"جاري الطباعة",
  ready:"جاهز",
  delivery:"في التوصيل",
  completed:"تم التسليم",
  cancelled:"ملغي",
};

function value(x: unknown){ const s=String(x??"").trim(); return s||"—"; }

function formatDateTime(input: unknown){
  if (!input) return "—";
  let date: Date | null = null;
  if (input instanceof Date) date = input;
  else if (typeof input === "object" && input !== null && "toDate" in input && typeof input.toDate === "function") {
    date = input.toDate();
  } else if (typeof input === "string" || typeof input === "number") {
    const parsed = new Date(input);
    if (Number.isFinite(parsed.getTime())) date = parsed;
  }
  return date && Number.isFinite(date.getTime())
    ? date.toLocaleString("ar-MA", { timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "—";
}

function AdminGroupOrderDetailContent(){
  const params=useParams<{groupOrderNumber:string}>();
  const router=useRouter();
  const groupOrderNumber=decodeURIComponent(params.groupOrderNumber);
  const [order,setOrder]=useState<AdminGroupOrder|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);
  const [damageDeduction,setDamageDeduction]=useState("0");

  useEffect(()=>{
    loadAdminGroupOrder(groupOrderNumber)
      .then(setOrder)
      .catch(()=>setMessage("تعذر تحميل الطلب الجماعي."))
      .finally(()=>setLoading(false));
  },[groupOrderNumber]);

  if(loading) return <main className="adminCenter"><p>جاري تحميل الطلب الجماعي…</p></main>;
  if(!order) return <main className="adminCenter"><p>الطلب الجماعي غير موجود.</p></main>;

  const members=Array.isArray(order.members)?order.members.map(String):[];

  return (
        <main className="adminDetailPage">
          <div className="adminDetailTop">
            <button type="button" onClick={()=>router.push("/admin")}>العودة</button>
            <div>
              <p className="eyebrow">GROUP ORDER</p>
              <h1 dir="ltr">{value(order.groupOrderNumber??order.id)}</h1>
            </div>
          </div>

          {message && <p className="formError">{message}</p>}

          <section className="adminDetailGrid">
            <article className="adminDetailCard">
              <h2>الطلب</h2>
              <dl>
                <div><dt>النوع</dt><dd>{value(order.orderType)}</dd></div>
                <div><dt>عدد الأفراد</dt><dd>{Number(order.quantity??0)}</dd></div>
                <div><dt>الحالة</dt><dd>
                  <select value={String(order.status??"received")} disabled={saving}
                    onChange={async e=>{
                      const status=e.target.value;
                      setSaving(true);
                      try{
                        await updateGroupOrderStatus(String(order.groupOrderNumber??order.id),status);
                        setOrder({...order,status});
                      }finally{setSaving(false);}
                    }}>
                    {Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </dd></div>
              </dl>
            </article>

            <article className="adminDetailCard">
              <h2>المسؤول</h2>
              <dl>
                <div><dt>الاسم</dt><dd>{value(order.responsibleName)}</dd></div>
                <div><dt>الهاتف</dt><dd dir="ltr">{value(order.phoneNumber)}</dd></div>
                <div><dt>المدينة</dt><dd>{value(order.city)}</dd></div>
                <div><dt>العنوان</dt><dd>{value(order.address)}</dd></div>
              </dl>
            </article>

            <article className="adminDetailCard">
              <h2>الموعد</h2>
              <dl>
                <div><dt>طريقة الاستلام</dt><dd>{value(order.deliveryMethod)}</dd></div>
                <div><dt>موعد الاستلام</dt><dd>{formatDateTime(order.scheduledAt)}</dd></div>
                {Boolean(order.returnAt) && <div><dt>موعد إرجاع الكراء</dt><dd>{formatDateTime(order.returnAt)}</dd></div>}
                <div><dt>ملاحظات</dt><dd>{value(order.notes)}</dd></div>
              </dl>
            </article>
          </section>

          {String(order.orderType)==="شراء" && (
            <section className="adminDetailCard">
              <h2>أسماء أفراد المجموعة</h2>
              {members.length===0?<p>لا توجد أسماء مكتوبة يدويًا.</p>:(
                <ol className="groupMembersList">
                  {members.map((member,index)=><li key={index}>{member}</li>)}
                </ol>
              )}
              {typeof order.membersExcelUrl === "string" && order.membersExcelUrl.startsWith("https://") && (
                <p className="adminGroupExcelFile">
                  <strong>ملف أسماء المجموعة المرفق:</strong>{" "}
                  <a href={order.membersExcelUrl} target="_blank" rel="noopener noreferrer">
                    {value(order.membersExcelName) === "—" ? "فتح ملف Excel" : value(order.membersExcelName)}
                  </a>
                </p>
              )}
            </section>
          )}

          {String(order.orderType)==="شراء" && (
            <>
              <section className="adminDetailCard">
                <h2>المنتج والتخصيص الموحد</h2>
                <dl>
                  <div><dt>المنتج</dt><dd>{String(order.productType)==="shawlAndCap" ? "وشاح وقبعة فقط دون البدلة" : "بدلة تخرج كاملة"}</dd></div>
                  <div><dt>نطاق التخصيص</dt><dd>تصميم واحد معمم على جميع أفراد المجموعة</dd></div>
                </dl>
                {(["rightShawl","leftShawl","backShawl","cap"] as const).map((key) => {
                  const option = order[key] as {enabled?:boolean;type?:string;text?:string;logoPath?:string|null} | undefined;
                  if (!option?.enabled) return null;
                  const labels: Record<string,string> = {rightShawl:"الجانب الأيمن من الوشاح",leftShawl:"الجانب الأيسر من الوشاح",backShawl:"ظهر الوشاح",cap:"القبعة"};
                  return <div className="adminGroupPrintRow" key={key}>
                    <strong>{labels[key]}</strong>
                    <p>{option.type==="text" ? "نص" : option.type==="logo" ? "شعار" : "نص + شعار"}{option.text ? ` — ${option.text}` : ""}</p>
                    {option.logoPath && <a href={option.logoPath} target="_blank" rel="noopener noreferrer">عرض ملف الشعار</a>}
                  </div>;
                })}
              </section>
              <section className="adminDetailCard">
                <h2>الصور المرجعية</h2>
                {Array.isArray(order.referenceImages) && order.referenceImages.length ? (
                  <div className="adminGroupReferenceGrid">
                    {(order.referenceImages as string[]).map((url,index)=><a key={url} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`الصورة المرجعية ${index+1}`} /><span>عرض الصورة {index+1}</span></a>)}
                  </div>
                ) : <p>لا توجد صور مرجعية مرفقة.</p>}
              </section>
            </>
          )}

          {String(order.orderType)==="كراء" && (
            <section className="adminDetailCard">
              <h2>تفاصيل الكراء والضمان</h2>
              <dl>
                <div><dt>القماش</dt><dd>{value(order.fabric)}</dd></div>
                <div><dt>لون الوشاح</dt><dd>{value(order.shawlColor)}</dd></div>
                <div><dt>ثمن الكراء للبدلة الواحدة</dt><dd>{Number(order.unitPriceApplied??0)} درهم</dd></div>
                <div><dt>مجموع ثمن الكراء</dt><dd>{Number(order.rentalFeeAmount??order.productTotalEstimate??0)} درهم</dd></div>
                <div><dt>الضمان للبدلة الواحدة</dt><dd>{Number(order.rentalSecurityDepositUnit??0)} درهم</dd></div>
                <div><dt>مجموع ضمان المجموعة</dt><dd>{Number(order.rentalSecurityDepositAmount??0)} درهم</dd></div>
                <div><dt>رسوم التوصيل</dt><dd>{Number(order.deliveryFeeApplied??0)} درهم</dd></div>
                <div><dt>المبلغ المطلوب عند الاستلام</dt><dd>{Number(order.amountDueNowEstimate??(Number(order.rentalSecurityDepositAmount??0)+Number(order.deliveryFeeApplied??0)))} درهم</dd></div>
                <div><dt>حالة استلام الضمان</dt><dd>{value(order.rentalDepositStatus)==="pending"?"لم يتم تسجيل الاستلام":value(order.rentalDepositStatus)}</dd></div>
                {order.rentalDepositStatus==="collected" && <div><dt>المبلغ المسجل استلامه</dt><dd>{Number(order.rentalDepositCollectedAmount??0)+Number(order.rentalDeliveryFeeCollectedAmount??0)} درهم</dd></div>}
                <div><dt>حالة الإرجاع</dt><dd>{value(order.rentalReturnStatus)}</dd></div>
              </dl>
              <p>يُخصم مجموع ثمن الكراء وأي تعويض عن الضرر من الضمان بعد إرجاع المجموعة، ثم يُعاد المتبقي.</p>
              {order.rentalDepositStatus !== "collected" && (
                <button type="button" disabled={saving} onClick={async()=>{
                  setSaving(true); setMessage("");
                  try {
                    await confirmGroupRentalDepositReceived(String(order.groupOrderNumber??order.id));
                    setOrder({...order,rentalDepositStatus:"collected",rentalDepositCollectedAmount:Number(order.rentalSecurityDepositAmount??0)});
                  } catch(error) { setMessage(error instanceof Error ? error.message : "تعذر تسجيل استلام الضمان."); }
                  finally { setSaving(false); }
                }}>تسجيل استلام ضمان المجموعة</button>
              )}
              {order.rentalDepositStatus === "collected" && order.rentalReturnStatus !== "returned" && (
                <div className="formSection">
                  <label>خصم الضرر للمجموعة كاملة (درهم)
                    <input type="number" min="0" step="1" value={damageDeduction} onChange={e=>setDamageDeduction(e.target.value)} disabled={saving} />
                  </label>
                  <button type="button" disabled={saving || !Number.isSafeInteger(Number(damageDeduction)) || Number(damageDeduction)<0}
                    onClick={async()=>{
                      if(!window.confirm("تأكيد إرجاع المجموعة وتسوية الضمان؟ لا يمكن تكرار هذه العملية بعد الحفظ.")) return;
                      setSaving(true); setMessage("");
                      try {
                        const result=await settleGroupRentalReturn({groupOrderNumber:String(order.groupOrderNumber??order.id),damageDeduction:Number(damageDeduction)});
                        setOrder({...order,rentalReturnStatus:"returned",rentalDamageDeduction:result.damage,rentalRefundAmount:result.refund,rentalAdditionalDamageDue:result.additionalDue,rentalSettlementStatus:"settled"});
                      } catch(error) { setMessage(error instanceof Error ? error.message : "تعذرت تسوية إرجاع المجموعة."); }
                      finally { setSaving(false); }
                    }}>تأكيد إرجاع المجموعة وتسوية الضمان</button>
                </div>
              )}
              {order.rentalReturnStatus === "returned" && (
                <dl>
                  <div><dt>خصم الضرر</dt><dd>{Number(order.rentalDamageDeduction??0)} درهم</dd></div>
                  <div><dt>المبلغ المسترد</dt><dd>{Number(order.rentalRefundAmount??0)} درهم</dd></div>
                  <div><dt>مبلغ إضافي مستحق</dt><dd>{Number(order.rentalAdditionalDamageDue??0)} درهم</dd></div>
                </dl>
              )}
            </section>
          )}
        </main>
  );
}

export default function AdminGroupOrderDetailClient() {
  return <AdminGuard>{() => <AdminGroupOrderDetailContent />}</AdminGuard>;
}
