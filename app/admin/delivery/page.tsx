import type { Metadata } from "next";
import AdminDeliveryClient from "./AdminDeliveryClient";
export const metadata: Metadata = { title:"إدارة التوصيل", robots:{index:false,follow:false} };
export default function AdminDeliveryPage(){ return <AdminDeliveryClient/>; }
