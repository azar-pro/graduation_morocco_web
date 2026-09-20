import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://graduationmorocco.ma";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Morocco Graduation | بدلات وأوشحة التخرج في المغرب",
    template: "%s | Morocco Graduation",
  },
  description:
    "بدلات تخرج للشراء والكراء في المغرب، أوشحة مخصصة، طباعة الأسماء والطلبات الجماعية للطلاب والجامعات.",
  applicationName: "Morocco Graduation",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_MA",
    siteName: "Morocco Graduation",
    title: "Morocco Graduation | بدلات وأوشحة التخرج في المغرب",
    description:
      "بدلات تخرج للشراء والكراء، أوشحة مخصصة وطلبات جماعية مع توصيل داخل المغرب.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Morocco Graduation",
    description: "بدلات وأوشحة التخرج في المغرب للشراء والكراء والتخصيص.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
