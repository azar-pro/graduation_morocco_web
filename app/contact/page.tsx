import type { Metadata } from "next";
import ContactPageClient from "./ContactPageClient";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description: "تواصل مع Graduation Morocco للاستفسار عن بدلات التخرج والطلبات الفردية والجماعية في المغرب.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() { return <ContactPageClient />; }
