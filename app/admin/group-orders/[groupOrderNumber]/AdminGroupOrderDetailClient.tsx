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

          {String(order.orderType)==="كراء" && (
            <section className="adminDetailCard">
              <h2>تفاصيل الكراء</h2>
              <p>هذا الطلب لا يحتوي أسماء أفراد أو طباعة، والعودة بعد 24 ساعة من موعد الاستلام وفق قواعد الطلب الحالية.</p>
            </section>
          )}
        </main>
      )}
    </AdminGuard>
  );
}
