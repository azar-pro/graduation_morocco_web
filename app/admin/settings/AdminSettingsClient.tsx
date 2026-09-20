"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminGuard from "../AdminGuard";
import { loadShopAdminSettings, saveShopAdminSettings } from "@/lib/admin-data";

export default function AdminSettingsClient(){
  const [data,setData]=useState<Record<string, unknown>>({});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    loadShopAdminSettings()
      .then(setData)
      .catch(()=>setMessage("تعذر تحميل الإعدادات."))
      .finally(()=>setLoading(false));
  },[]);

  function patch(key:string,value:unknown){ setData(d=>({...d,[key]:value})); }

  async function submit(e:FormEvent){
    e.preventDefault(); setSaving(true); setMessage("");
    try{
      await saveShopAdminSettings({
        businessName:String(data.businessName??"Graduation Morocco"),
        whatsappNumber:String(data.whatsappNumber??""),
        email:String(data.email??""),
        storeAddress:String(data.storeAddress??""),
        acceptingOrders:data.acceptingOrders!==false,
        purchaseEnabled:data.purchaseEnabled!==false,
        rentalEnabled:data.rentalEnabled!==false,
        maintenanceMode:data.maintenanceMode===true,
        cashAtStoreEnabled:data.cashAtStoreEnabled!==false,
        bankTransferEnabled:data.bankTransferEnabled!==false,
        cashTransferAgencyEnabled:data.cashTransferAgencyEnabled!==false,
        depositPaymentEnabled:data.depositPaymentEnabled!==false,
        fullPaymentEnabled:data.fullPaymentEnabled!==false,
        paymentDeadlineHours:Math.max(1,Math.min(720,Number(data.paymentDeadlineHours??48))),
        depositPercentage:Math.max(1,Math.min(100,Number(data.depositPercentage??50))),
        customerNotice:String(data.customerNotice??""),
        cancellationPolicy:String(data.cancellationPolicy??""),
        exchangeReturnPolicy:String(data.exchangeReturnPolicy??""),
      });
      setMessage("تم حفظ الإعدادات.");
    }catch{
      setMessage("تعذر حفظ الإعدادات.");
    }finally{setSaving(false);}
  }

  return (
    <AdminGuard>
      {()=>(
        <main className="adminDetailPage">
          <div className="adminDetailTop">
            <a className="adminBackLink" href="/admin">العودة للوحة</a>
            <div><p className="eyebrow">SETTINGS</p><h1>إعدادات المتجر</h1></div>
          </div>
          {loading && <p className="formNotice">جاري تحميل الإعدادات…</p>}
          {message && <p className={message.startsWith("تم ")?"formNotice":"formError"}>{message}</p>}
          {!loading && (
            <form className="orderForm" onSubmit={submit}>
              <section className="formSection">
                <h2>بيانات النشاط</h2>
                <div className="fieldGrid">
                  <label>اسم النشاط<input value={String(data.businessName??"")} onChange={e=>patch("businessName",e.target.value)}/></label>
                  <label>واتساب<input value={String(data.whatsappNumber??"")} onChange={e=>patch("whatsappNumber",e.target.value)}/></label>
                  <label>البريد<input type="email" value={String(data.email??"")} onChange={e=>patch("email",e.target.value)}/></label>
                  <label>العنوان<input value={String(data.storeAddress??"")} onChange={e=>patch("storeAddress",e.target.value)}/></label>
                </div>
              </section>

              <section className="formSection">
                <h2>تشغيل الطلبات</h2>
                <div className="settingsChecks">
                  {[
                    ["acceptingOrders","استقبال الطلبات"],
                    ["purchaseEnabled","الشراء"],
                    ["rentalEnabled","الكراء"],
                    ["maintenanceMode","وضع الصيانة"],
                  ].map(([key,label])=>(
                    <label key={key}><input type="checkbox"
                      checked={key==="maintenanceMode"?data[key]===true:data[key]!==false}
                      onChange={e=>patch(key,e.target.checked)}/>{label}</label>
                  ))}
                </div>
              </section>

              <section className="formSection">
                <h2>الدفع</h2>
                <div className="settingsChecks">
                  {[
                    ["cashAtStoreEnabled","الدفع نقدًا عند الاستلام"],
                    ["bankTransferEnabled","تحويل بنكي"],
                    ["cashTransferAgencyEnabled","وكالة تحويل"],
                    ["depositPaymentEnabled","التسبيق"],
                    ["fullPaymentEnabled","الدفع الكامل"],
                  ].map(([key,label])=>(
                    <label key={key}><input type="checkbox" checked={data[key]!==false}
                      onChange={e=>patch(key,e.target.checked)}/>{label}</label>
                  ))}
                </div>
                <div className="fieldGrid">
                  <label>مهلة الدفع بالساعات<input type="number" min="1" max="720" value={Number(data.paymentDeadlineHours??48)} onChange={e=>patch("paymentDeadlineHours",Number(e.target.value))}/></label>
                  <label>نسبة التسبيق %<input type="number" min="1" max="100" value={Number(data.depositPercentage??50)} onChange={e=>patch("depositPercentage",Number(e.target.value))}/></label>
                </div>
              </section>

              <section className="formSection">
                <h2>سياسات العملاء</h2>
                <label>ملاحظة عامة<textarea rows={3} maxLength={3000} value={String(data.customerNotice??"")} onChange={e=>patch("customerNotice",e.target.value)}/></label>
                <label>سياسة الإلغاء<textarea rows={3} maxLength={3000} value={String(data.cancellationPolicy??"")} onChange={e=>patch("cancellationPolicy",e.target.value)}/></label>
                <label>سياسة الاستبدال والاسترجاع<textarea rows={3} maxLength={3000} value={String(data.exchangeReturnPolicy??"")} onChange={e=>patch("exchangeReturnPolicy",e.target.value)}/></label>
              </section>

              <button className="submitOrder" disabled={saving}>{saving?"جارٍ الحفظ…":"حفظ الإعدادات"}</button>
            </form>
          )}
        </main>
      )}
    </AdminGuard>
  );
}
