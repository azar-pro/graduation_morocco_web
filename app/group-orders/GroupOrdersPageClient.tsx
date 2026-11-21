"use client";
import SiteHeader from "@/components/SiteHeader";
import GroupOrderClient from "./GroupOrderClient";
import { useLanguage } from "@/components/LanguageProvider";
export default function GroupOrdersPageClient() {
 const { isArabic }=useLanguage(); const t=(ar:string,en:string)=>isArabic?ar:en;
 return <div className="orderRoute"><SiteHeader/><main className="utilityPage orderPage"><section className="orderShell">
 <header className="orderIntro"><p className="eyebrow">{t("للمجموعات والدفعات الجامعية","For groups and graduating classes")}</p>
 <h1>{t("طلب جماعي من 5 إلى 100 شخص","Group orders for 5 to 100 people")}</h1>
 <p>{t("اختر الشراء أو الكراء، أدخل معلومات مسؤول المجموعة، ثم أرسل الطلب مباشرة.","Choose purchase or rental, enter the group coordinator’s details, and submit your request directly.")}</p></header>
 <GroupOrderClient/>
 </section></main></div>;
}
