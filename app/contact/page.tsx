import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import ContactPageClient from "./ContactPageClient";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description: "تواصل مع Graduation Morocco للاستفسار عن بدلات التخرج والطلبات الفردية والجماعية في المغرب.",
  alternates: { canonical: "/contact" },
};

const whatsapp = "https://wa.me/212717208919";

export default function ContactPage() { return <ContactPageClient />; }
