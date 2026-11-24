"use client";
import SiteHeader from "@/components/SiteHeader";
import TrackingClient from "./TrackingClient";
import { useLanguage } from "@/components/LanguageProvider";
export default function TrackOrderPageClient() {
 const { isArabic } = useLanguage();
 const t=(ar:string,en:string)=>isArabic?ar:en;
 return <div className="orderRoute"><SiteHeader/><main className="utilityPage"><section className="utilityCard">
 <p className="eyebrow">{t("تتبع الطلب","Order tracking")}</p>
 <h1>{t("اعرف حالة طلبك","Check your order status")}</h1>
 <p>{t("أدخل رقم الطلب أو رقم الهاتف المغربي المستخدم عند الطلب. لا تحتاج إلى إنشاء حساب.","Enter your order number or the Moroccan phone number used when ordering. No account is required.")}</p>
 <TrackingClient/>
 </section></main></div>;
}
