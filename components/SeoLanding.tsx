import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { useLanguage } from "@/components/LanguageProvider";

type Faq = { q: string; a: string };

export default function SeoLanding({
  eyebrow,
  title,
  intro,
  bullets,
  faq,
  schemaName,
  schemaDescription,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  bullets: string[];
  faq: Faq[];
  schemaName: string;
  schemaDescription: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: schemaName,
    description: schemaDescription,
    provider: {
      "@type": "Organization",
      name: "Morocco Graduation",
      url: "https://graduationmorocco.ma/",
    },
    areaServed: { "@type": "Country", name: "Morocco" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="orderRoute">
        <SiteHeader />
        <main className="seoPage">
        <section className="seoHero">
          <p className="eyebrow">{isArabic ? eyebrow : e.eyebrow}</p>
          <h1>{isArabic ? title : e.title}</h1>
          <p>{isArabic ? intro : e.intro}</p>
          <div className="actions">
            <Link className="primaryButton" href="/order">{isArabic ? "ابدأ الطلب" : "Start an order"}</Link>
            <Link className="secondaryButton" href="/group-orders">{isArabic ? "طلب جماعي" : "Group order"}</Link>
          </div>
        </section>

        <section className="seoContentGrid">
          {bullets.map((item) => (
            <article className="seoFeature" key={item}>
              <span>✓</span>
              <p>{isArabic ? item : e.bullets[bullets.indexOf(item)] ?? item}</p>
            </article>
          ))}
        </section>

        <section className="seoFaq">
          <p className="eyebrow">{isArabic ? "أسئلة شائعة" : e.faqEyebrow}</p>
          <h2>{isArabic ? "معلومات مهمة قبل الطلب" : e.faqTitle}</h2>
          <div className="faqList">
            {faq.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="seoCta">
          <h2>{isArabic ? "جاهز لتجهيز طلب التخرج؟" : e.ctaTitle}</h2>
          <p>{isArabic ? "يمكنك إرسال الطلب مباشرة بدون إنشاء حساب." : e.ctaText}</p>
          <Link className="primaryButton" href="/order">{isArabic ? "ابدأ الآن" : "Start now"}</Link>
        </section>
        </main>
      </div>
    </>
  );
}
