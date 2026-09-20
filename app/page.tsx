import Image from "next/image";
import Link from "next/link";

const services = [
  ["✦", "هوية فاخرة", "ألوان كحلية وذهبية ولمسات أنيقة مستوحاة من أجواء التخرج."],
  ["✎", "تخصيص واضح", "نحرص على أن تعكس القطعة اسمك وتخصصك وتفاصيلك."],
  ["◉", "تجربة بسيطة", "المعلومات الأساسية تظهر لك بوضوح حتى تعرف الخطوة التالية."],
  ["◎", "مساعدة عند الحاجة", "يمكنك التواصل معنا إذا احتجت إلى توضيح قبل الطلب أو بعده."],
];

const steps = [
  ["1", "▣", "اختر المنتج", "ابدأ من المنتجات المتاحة واختر ما يناسبك."],
  ["2", "☷", "حدد التفاصيل", "أدخل المقاس والتخصيص والبيانات المطلوبة."],
  ["3", "✓", "راجع طلبك", "تحقق من التفاصيل قبل إرسال الطلب."],
  ["4", "➜", "استلم طلبك", "اختر الاستلام أو التوصيل حسب الخيارات المتاحة."],
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="appHome" dir="rtl">
        <header className="appHeader">
          <Link href="/" className="appLogo" aria-label="Morocco Graduation الرئيسية">
            <Image src="/logo.png" width={180} height={62} alt="Morocco Graduation" priority />
          </Link>

          <nav className="appNav" aria-label="التنقل الرئيسي">
            <Link href="/">الرئيسية</Link>
            <Link href="#services">خدماتنا</Link>
            <Link href="#about">من نحن</Link>
            <Link className="appContactButton" href="#contact">تواصل معنا</Link>
            <span className="appLanguage" aria-label="English version coming soon">EN</span>
          </nav>

          <div className="appMobileHeaderActions">
            <span className="appLanguage">EN</span>
            <span className="appMenuIcon" aria-hidden="true">☰</span>
          </div>
        </header>

        <main>
          <section className="appHero">
            <Image
              className="appHeroImage"
              src="/hero_graduation.png"
              alt="خريجة ترتدي بدلة ووشاح التخرج من Graduation Morocco"
              fill
              priority
              sizes="100vw"
            />
            <div className="appHeroOverlay" />
            <div className="appHeroCopy">
              <Image className="appHeroMark" src="/logo_mark.png" width={130} height={130} alt="" />
              <p className="appHeroBrand">GRADUATION MOROCCO</p>
              <h1>اجعل يوم تخرجك أكثر تميزًا</h1>
              <p className="appHeroSubtitle">
                بدلات وأوشحة تخرج بتفاصيل أنيقة، مع خيارات شراء وكراء وتخصيص تناسب لحظتك.
              </p>

              <div className="appHeroActions">
                <Link className="appPrimaryButton" href="/order">ابدأ طلبك الآن</Link>
                <Link className="appOutlineLight" href="#contact">تواصل معنا</Link>
              </div>

              <div className="appHeroBenefits">
                <span>جودة ◈</span>
                <span>تخصيص ✦</span>
                <span>توصيل 🚚</span>
              </div>
            </div>
          </section>

          <section className="appTrust">
            جودة وتفاصيل مدروسة • خيارات تخصيص واضحة • استلام وتوصيل حسب المنطقة
          </section>

          <section id="about" className="appSection">
            <div className="appSectionTitle">
              <h2>من نحن</h2>
              <p>نصنع تجربة تخرج أنيقة وبسيطة تبدأ من اختيار القطعة وتنتهي بلحظة تستحق أن تُحفظ.</p>
            </div>

            <div className="appAboutCard">
              <div className="appAboutLogo">
                <Image src="/logo.png" width={280} height={170} alt="Graduation Morocco" />
              </div>
              <div className="appAboutCopy">
                <h3>لحظة تستحق أن تُحفظ.</h3>
                <p>
                  في Graduation Morocco نهتم بأن تبدو تجربة الطلب واضحة ومريحة، وأن تحمل كل قطعة
                  تفاصيل تليق بيوم التخرج؛ من البدلة والوشاح إلى التخصيص والاستلام.
                </p>
                <div className="appPills">
                  <span>بدلات تخرج</span>
                  <span>أوشحة مخصصة</span>
                  <span>شراء وكراء</span>
                  <span>طلبات جماعية</span>
                </div>
              </div>
            </div>
          </section>

          <section id="services" className="appSection">
            <div className="appSectionTitle">
              <h2>خدماتنا</h2>
              <p>كل ما تحتاجه لتجعل إطلالتك في يوم التخرج متكاملة وأنيقة.</p>
            </div>

            <div className="appServiceGrid">
              {services.map(([icon, title, body]) => (
                <article className="appServiceCard" key={title}>
                  <div className="appServiceIcon">{icon}</div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>

            <div className="appQuickLinks">
              <Link href="/graduation-gowns">شراء بدلات التخرج</Link>
              <Link href="/graduation-gowns-rental">كراء بدلات التخرج</Link>
              <Link href="/custom-graduation-stoles">الأوشحة المخصصة</Link>
              <Link href="/group-orders">الطلبات الجماعية</Link>
            </div>
          </section>

          <section className="appSection">
            <div className="appSectionTitle">
              <h2>كيف تنشئ طلبك؟</h2>
              <p>خطوات بسيطة من اختيار المنتج إلى الاستلام.</p>
            </div>

            <div className="appSteps">
              {steps.map(([number, icon, title, body]) => (
                <article className="appStepCard" key={number}>
                  <div className="appStepTop">
                    <span className="appStepIcon">{icon}</span>
                    <span className="appStepNumber">{number}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="appWhy">
            <h2>لماذا Graduation Morocco؟</h2>
            <p>
              لأن يوم التخرج ليس يومًا عاديًا. نركز على أناقة القطعة، وضوح خيارات التخصيص،
              وسهولة إنشاء الطلب ومتابعته حتى الاستلام.
            </p>
          </section>

          <section className="appSection">
            <div className="appSectionTitle">
              <h2>الاستلام والتوصيل</h2>
              <p>نوضح لك خيار الاستلام أو التوصيل ضمن خطوات الطلب حسب الخيارات المتاحة في منطقتك.</p>
            </div>

            <div className="appDeliveryGrid">
              <article className="appDeliveryCard">
                <div className="appDeliveryIcon">⌂</div>
                <h3>الاستلام</h3>
                <p>يمكنك اختيار الاستلام إذا كان الخيار متاحًا.</p>
              </article>
              <article className="appDeliveryCard">
                <div className="appDeliveryIcon">🚚</div>
                <h3>توصيل</h3>
                <p>عند اختيار التوصيل، أدخل العنوان الكامل والواضح.</p>
              </article>
            </div>
          </section>

          <section id="contact" className="appCta">
            <h2>جاهز تبدأ؟</h2>
            <p>ابدأ طلبك الآن ودعنا نساعدك في جعل يوم تخرجك أكثر تميزًا.</p>
            <div className="appCtaActions">
              <Link className="appDarkButton" href="/order">ابدأ طلبك الآن</Link>
              <Link className="appCtaSecondary" href="/track-order">تتبع طلبك</Link>
            </div>
          </section>
        </main>

        <footer className="appFooter">
          <Image src="/logo_mark.png" width={100} height={100} alt="" />
          <strong>Graduation Morocco</strong>
          <p>أناقة • تخصيص • تجربة تخرج تستحق الذكر</p>
          <nav>
            <Link href="#about">من نحن</Link>
            <Link href="#contact">تواصل معنا</Link>
            <Link href="/order">ابدأ طلبك الآن</Link>
          </nav>
        </footer>

        <nav className="appBottomNav" aria-label="التنقل على الهاتف">
          <Link href="/"><span>⌂</span>الرئيسية</Link>
          <Link href="/order"><span>🎓</span>طلب جديد</Link>
          <Link href="/track-order"><span>🚚</span>التتبع</Link>
          <Link href="#contact"><span>◉</span>تواصل</Link>
        </nav>
      </div>
    </>
  );
}
