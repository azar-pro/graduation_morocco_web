"use client";

import { useEffect, useState } from "react";
import AdminGuard from "../AdminGuard";
import { loadAdminDelivery, saveAdminDeliveryCity, type AdminDeliveryCity } from "@/lib/admin-data";

export default function AdminDeliveryClient(){
  const [cities,setCities]=useState<AdminDeliveryCity[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState("");

  useEffect(()=>{
    loadAdminDelivery()
      .then(setCities)
      .catch(()=>setMessage("تعذر تحميل إعدادات التوصيل."))
      .finally(()=>setLoading(false));
  },[]);

  function patch(id:string,key:keyof AdminDeliveryCity,value:unknown){
    setCities(items=>items.map(item=>item.id===id?{...item,[key]:value}:item));
  }

  async function save(city:AdminDeliveryCity){
    setSaving(city.id); setMessage("");
    try{
      await saveAdminDeliveryCity(city);
      setMessage("تم حفظ إعدادات التوصيل.");
    }catch{
      setMessage("تعذر حفظ إعدادات التوصيل.");
    }finally{
      setSaving("");
    }
  }

  return (
    <AdminGuard>
      {()=>(
        <main className="adminDetailPage">
          <div className="adminDetailTop">
            <a className="adminBackLink" href="/admin">العودة للوحة</a>
            <div><p className="eyebrow">DELIVERY</p><h1>إدارة التوصيل</h1></div>
          </div>
          {loading && <p className="formNotice">جاري تحميل المدن…</p>}
          {message && <p className={message.startsWith("تم ")?"formNotice":"formError"}>{message}</p>}
          <div className="adminProductGrid">
            {cities.map(city=>(
              <article className="adminProductCard" key={city.id}>
                <div className="productCardHead">
                  <div><small>{city.id}</small><h2>{city.name || city.id}</h2></div>
                  <label className="switchLine">
                    <input type="checkbox" checked={city.active}
                      onChange={e=>patch(city.id,"active",e.target.checked)} />
                    متاح
                  </label>
                </div>
                <div className="fieldGrid">
                  <label>اسم المدينة
                    <input value={city.name} disabled={city.id==="fes"}
                      onChange={e=>patch(city.id,"name",e.target.value)} />
                  </label>
                  <label>رسوم التوصيل
                    <input type="number" min="0" value={city.price} disabled={city.id==="fes"}
                      onChange={e=>patch(city.id,"price",Number(e.target.value))} />
                  </label>
                </div>
                {city.id==="fes" && <p className="sectionHint">رسوم فاس ثابتة حاليًا في منطق التطبيق وقواعد Firestore.</p>}
                <button className="submitOrder" type="button" disabled={saving===city.id||city.id==="fes"}
                  onClick={()=>void save(city)}>
                  {saving===city.id?"جارٍ الحفظ…":"حفظ"}
                </button>
              </article>
            ))}
          </div>
        </main>
      )}
    </AdminGuard>
  );
}
