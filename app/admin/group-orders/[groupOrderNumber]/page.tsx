import type { Metadata } from "next";
import AdminGroupOrderDetailClient from "./AdminGroupOrderDetailClient";
export const metadata: Metadata = { title:"تفاصيل الطلب الجماعي", robots:{index:false,follow:false} };
export default function AdminGroupOrderDetailPage(){ return <AdminGroupOrderDetailClient/>; }
