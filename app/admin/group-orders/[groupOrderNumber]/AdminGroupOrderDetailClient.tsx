"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminGuard from "../../AdminGuard";
import {
  loadAdminGroupOrder,
  updateGroupOrderStatus,
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

export default function AdminGroupOrderDetailClient(){
  const params=useParams<{groupOrderNumber:string}>();
  const router=useRouter();
  const groupOrderNumber=decodeURIComponent(params.groupOrderNumber);
  const [order,setOrder]=useState<AdminGroupOrder|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);

  async function refresh(){
    setLoading(true);
    try{
      setOrder(await loadAdminGroupOrder(groupOrderNumber));
    }catch{
      setMessage("تعذر تحميل الطلب الجماعي.");
    }finally{
      setLoading(false);
    }
  }

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
    <AdminGuard>
      {()=>(
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
                <div><dt>ملاحظات</dt><dd>{value(order.notes)}</dd></div>
              </dl>
            </article>
          </section>

          {String(order.orderType)==="شراء" && (
            <section className="adminDetailCard">
              <h2>أسماء أفراد المجموعة</h2>
              {members.length===0?<p>لا توجد أسماء محفوظة.</p>:(
                <ol className="groupMembersList">
                  {members.map((member,index)=><li key={index}>{member}</li>)}
                </ol>
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
                    {(order.referenceImages as string[]).map((url,index)=><a key={url} href={url} target="_blank" rel="noopener noreferrer">عرض الصورة {index+1}</a>)}
                  </div>
                ) : <p>لا توجد صور مرجعية مرفقة.</p>}
              </section>
            </>
          )}

          {String(order.orderType)==="كراء" && (
            <section className="adminDetailCard">
              <h2>تفاصيل الكراء</h2>
              <p>هذا الطلب لا يحتوي أسماء أفراد أو تخصيص طباعة أو صور مرجعية، والعودة بعد 24 ساعة من موعد الاستلام وفق قواعد الطلب الحالية.</p>
            </section>
          )}
        </main>
      )}
    </AdminGuard>
  );
}
