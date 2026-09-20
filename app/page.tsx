import Link from "next/link";

const services = [
  ["شراء بدلة تخرج", "بدلات ساتان وموبرة مع خيارات تخصيص مناسبة ليوم التخرج."],
  ["كراء بدلة تخرج", "خيار عملي للطلاب مع تحديد موعد الاستلام والإرجاع."],
  ["أوشحة تخرج مخصصة", "إضافة الاسم، التخصص والتفاصيل التي تريدها على الوشاح."],
  ["طلبات جماعية", "تنظيم طلبات المجموعات والدفعات الجامعية في مسار واحد واضح."],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://graduationmorocco.ma/#organization",
      name: "Morocco Graduation",
      url: "https://graduationmorocco.ma/",
    },
    {
      "@type": "WebSite",
      "@id": "https://graduationmorocco.ma/#website",
      url: "https://graduationmorocco.ma/",
      name: "Morocco Graduation",
      inLanguage: ["ar-MA", "fr-MA", "en"],
      publisher: { "@id": "https://graduationmorocco.ma/#organization" },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="siteHeader">
        <Link className="brand" href="/" aria-label="Morocco Graduation الرئيسية">
          MOROCCO <span>GRADUATION</span>
        </Link>
        <nav aria-label="التنقل الرئيسي">
          <Link href="/graduation-gowns">بدلات التخرج</Link>
          <Link href="/graduation-gowns-rental">الكراء</Link>
          <Link href="/custom-graduation-stoles">الأوشحة</Link>
          <Link href="/group-orders">طلبات جماعية</Link>
          <Link href="/track-order">تتبع الطلب</Link>
          <Link className="navCta" href="/order">ابدأ طلبك</Link>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="heroCopy">
            <p className="eyebrow">GRADUATION MOROCCO</p>
            <h1>بدلة تخرجك، بتفاصيل تليق بأهم لحظة.</h1>
            <p>
              شراء وكراء بدلات التخرج، أوشحة مخصصة وطلبات جماعية للطلاب
              والجامعات مع تجربة طلب بسيطة ومباشرة بدون إنشاء حساب.
            </p>
            <div className="actions">
              <Link className="primaryButton" href="/order">ابدأ طلبك الآن</Link>
              <Link className="secondaryButton" href="/group-orders">طلب جماعي</Link>
              <Link className="secondaryButton" href="/track-order">تتبع طلبك</Link>
            </div>
          </div>
          <div className="heroVisual" aria-hidden="true">
            <span>2026</span>
          </div>
        </section>

        <section className="trust" aria-label="مميزات الخدمة">
          <span>شراء وكراء</span>
          <span>تخصيص وطباعة</span>
          <span>طلبات جماعية</span>
          <span>توصيل داخل المغرب</span>
        </section>

        <section id="services" className="section">
          <div className="sectionHeading">
            <p className="eyebrow">كل ما تحتاجه للتخرج</p>
            <h2>خدمات تخرج مصممة للطلاب في المغرب</h2>
            <p>
              اختر ما يناسبك وابدأ الطلب مباشرة. لا يوجد حساب للعميل ولا خطوات تسجيل غير ضرورية.
            </p>
          </div>
          <div className="cards">
            {services.map(([title, text], index) => {
              const href = [
                "/graduation-gowns",
                "/graduation-gowns-rental",
                "/custom-graduation-stoles",
                "/group-orders",
              ][index];
              return (
                <Link className="card" href={href} key={title}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="seoIntro">
          <div>
            <p className="eyebrow">Morocco Graduation</p>
            <h2>بدلات تخرج في المغرب للشراء والكراء والتخصيص</h2>
          </div>
          <p>
            نوفر حلولًا واضحة للطلاب الباحثين عن بدلات التخرج، أوشحة التخرج
            المخصصة والطلبات الجماعية. ستتوسع هذه النسخة إلى صفحات منفصلة
            للمنتجات والمدن والأسئلة الشائعة حتى تكون كل خدمة قابلة للفهرسة
            والفهم من محركات البحث وأنظمة الذكاء الاصطناعي.
          </p>
        </section>
      </main>

      <footer>
        <strong>Morocco Graduation</strong>
        <p>أناقة • تخصيص • تجربة تخرج تستحق الذكر</p>
      </footer>
    </>
  );
}
