import Link from "next/link";

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
      <main className="seoPage">
        <section className="seoHero">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
          <div className="actions">
            <Link className="primaryButton" href="/order">ابدأ الطلب</Link>
            <Link className="secondaryButton" href="/group-orders">طلب جماعي</Link>
          </div>
        </section>

        <section className="seoContentGrid">
          {bullets.map((item) => (
            <article className="seoFeature" key={item}>
              <span>✓</span>
              <p>{item}</p>
            </article>
          ))}
        </section>

        <section className="seoFaq">
          <p className="eyebrow">أسئلة شائعة</p>
          <h2>معلومات مهمة قبل الطلب</h2>
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
          <h2>جاهز لتجهيز طلب التخرج؟</h2>
          <p>يمكنك إرسال الطلب مباشرة بدون إنشاء حساب.</p>
          <Link className="primaryButton" href="/order">ابدأ الآن</Link>
        </section>
      </main>
    </>
  );
}
