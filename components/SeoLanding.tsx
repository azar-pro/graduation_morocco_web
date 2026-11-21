"use client";

import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { useLanguage } from "@/components/LanguageProvider";

type Faq = { q: string; a: string };
type Copy = { eyebrow: string; title: string; intro: string; bullets: string[]; faq: Faq[]; faqEyebrow: string; faqTitle: string; ctaTitle: string; ctaText: string };

export default function SeoLanding({ eyebrow, title, intro, bullets, faq, schemaName, schemaDescription }: {
  eyebrow: string; title: string; intro: string; bullets: string[]; faq: Faq[]; schemaName: string; schemaDescription: string;
}) {
  const { isArabic } = useLanguage();
  const english: Copy = schemaName === "أوشحة تخرج مخصصة في المغرب" ? {
    eyebrow: "Custom graduation stoles", title: "Personalized graduation stoles with names or logos",
    intro: "Create a graduation stole for your class or occasion by adding text, logos, and reference images directly to your order.",
    bullets: ["Add custom text to your stole.", "Add a logo, text, or both.", "Upload reference images for your design.", "Order a stole only or a stole with a cap."],
    faq: [{ q: "Can I upload a logo?", a: "Yes. You can upload a logo image with a purchase order." }, { q: "How many reference images can I upload?", a: "You can upload up to 4 reference images per order." }, { q: "Is customization available for rentals?", a: "No. Current customization options are available for purchases only." }],
    faqEyebrow: "Frequently asked questions", faqTitle: "Important information before ordering",
    ctaTitle: "Ready to prepare your graduation order?", ctaText: "Submit your order directly without creating an account."
  } : schemaName === "شراء بدلات تخرج في المغرب" ? {
    eyebrow: "Graduation gowns", title: "Graduation gowns in Morocco for purchase and customization",
    intro: "Choose your graduation gown, fabric, and colour, add printing or a logo, and submit your order without creating an account.",
    bullets: ["Satin and velvet options, depending on product availability.", "Customize the shawl and cap with text or a logo.", "Delivery to several Moroccan cities or pickup, depending on available settings.", "Track your order later using your order number or phone number."],
    faq: [{ q: "Do I need to create an account?", a: "No. You can submit and track an order without an account." }, { q: "Can I print a name on the shawl?", a: "Yes. Purchase orders can include text, a logo, or both, depending on the selected print position." }, { q: "Which fabrics are available?", a: "Availability depends on the selected product. The main options are satin and plush fabric." }],
    faqEyebrow: "Frequently asked questions", faqTitle: "Important information before ordering",
    ctaTitle: "Ready to prepare your graduation order?", ctaText: "Submit your order directly without creating an account."
  } : {
    eyebrow: "Graduation gown rental", title: "Rent a graduation gown in Morocco with ease",
    intro: "Reserve a graduation gown for rental, choose the product, fabric, city, and collection time, with scheduling based on current order rules.",
    bullets: ["Book without creating an account.", "Choose satin or plush fabric, depending on product availability.", "Clear collection and return times.", "Track your order after submitting it."],
    faq: [{ q: "How long is the rental period?", a: "The current rental period is 24 hours from collection for individual and group orders." }, { q: "Is printing available with rentals?", a: "No. Printing and customization are currently available for purchase orders only." }, { q: "Can I rent gowns for a group?", a: "Yes. There is a separate group-order flow for 5 to 100 people." }],
    faqEyebrow: "Frequently asked questions", faqTitle: "Important information before ordering",
    ctaTitle: "Ready to prepare your graduation order?", ctaText: "Submit your order directly without creating an account."
  };
  const schema = {
    "@context": "https://schema.org", "@type": "Service", name: schemaName, description: schemaDescription,
    provider: { "@type": "Organization", name: "Morocco Graduation", url: "https://graduationmorocco.ma/" },
    areaServed: { "@type": "Country", name: "Morocco" },
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    <div className="orderRoute"><SiteHeader /><main className="seoPage">
      <section className="seoHero">
        <p className="eyebrow">{isArabic ? eyebrow : english.eyebrow}</p>
        <h1>{isArabic ? title : english.title}</h1>
        <p>{isArabic ? intro : english.intro}</p>
        <div className="actions">
          <Link className="primaryButton" href="/order">{isArabic ? "ابدأ الطلب" : "Start an order"}</Link>
          <Link className="secondaryButton" href="/group-orders">{isArabic ? "طلب جماعي" : "Group order"}</Link>
        </div>
      </section>
      <section className="seoContentGrid">
        {bullets.map((item, index) => <article className="seoFeature" key={item}><span>✓</span><p>{isArabic ? item : english.bullets[index] ?? item}</p></article>)}
      </section>
      <section className="seoFaq">
        <p className="eyebrow">{isArabic ? "أسئلة شائعة" : english.faqEyebrow}</p>
        <h2>{isArabic ? "معلومات مهمة قبل الطلب" : english.faqTitle}</h2>
        <div className="faqList">{faq.map((item, index) => <details key={item.q}>
          <summary>{isArabic ? item.q : english.faq[index]?.q ?? item.q}</summary>
          <p>{isArabic ? item.a : english.faq[index]?.a ?? item.a}</p>
        </details>)}</div>
      </section>
      <section className="seoCta">
        <h2>{isArabic ? "جاهز لتجهيز طلب التخرج؟" : english.ctaTitle}</h2>
        <p>{isArabic ? "يمكنك إرسال الطلب مباشرة بدون إنشاء حساب." : english.ctaText}</p>
        <Link className="primaryButton" href="/order">{isArabic ? "ابدأ الآن" : "Start now"}</Link>
      </section>
    </main></div>
  </>;
}
