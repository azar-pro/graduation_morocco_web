"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type Locale = "ar" | "en";

const copy = {
  ar: {
    home: "الرئيسية",
    newOrder: "طلب جديد",
    tracking: "التتبع",
    contact: "تواصل",
    services: "خدماتنا",
    aboutUs: "من نحن",
    contactUs: "تواصل معنا",
    startOrderNow: "ابدأ طلبك الآن",
    heroTitle: "اجعل يوم تخرجك أكثر تميزًا",
    heroSubtitle: "أزياء تخرج فاخرة، شالات مخصصة وتفاصيل مصممة بعناية لتليق بأهم لحظة في رحلتك الجامعية.",
    quality: "جودة",
    customization: "تخصيص",
    delivery: "توصيل",
    trustLine: "نساعدك على جمع التفاصيل في طلب واحد واضح بدل البحث بين عدة جهات.",
    aboutSubtitle: "Graduation Morocco ليست مجرد ملابس تخرج؛ نحن نهتم بأن تكون تفاصيل يومك الأخير في الجامعة جديرة بالذكر.",
    aboutHeadline: "لحظة تستحق أن تُحفظ.",
    aboutBody: "نصمم ونوفر قطعًا وتفاصيل تخرج تجمع بين الأناقة، التخصيص، والهوية المغربية. هدفنا أن تحصل على تجربة بسيطة من الطلب حتى الاستلام، مع اهتمام حقيقي بالتفاصيل.",
    aboutPills: ["أناقة", "تخصيص", "وضوح", "دعم"],
    servicesSubtitle: "كل ما تحتاجه لتجعل إطلالتك في يوم التخرج متكاملة وأنيقة.",
    premiumIdentity: "هوية فاخرة",
    premiumIdentityBody: "ألوان كحلية وذهبية ولمسات أنيقة مستوحاة من أجواء التخرج.",
    clearCustomization: "تخصيص واضح",
    clearCustomizationBody: "نحرص على أن تعكس القطعة اسمك وتخصصك وتفاصيلك.",
    simpleExperience: "تجربة بسيطة",
    simpleExperienceBody: "المعلومات الأساسية تظهر لك بوضوح حتى تعرف الخطوة التالية.",
    helpWhenNeeded: "مساعدة عند الحاجة",
    helpWhenNeededBody: "يمكنك التواصل معنا إذا احتجت إلى توضيح قبل الطلب أو بعده.",
    processTitle: "كيف تنشئ طلبك؟",
    processSubtitle: "خطوات بسيطة من اختيار المنتج إلى الاستلام.",
    chooseProduct: "اختر المنتج",
    chooseProductBody: "ابدأ من المنتجات المتاحة واختر ما يناسبك.",
    setDetails: "حدد التفاصيل",
    setDetailsBody: "أدخل المقاس والتخصيص والبيانات المطلوبة.",
    reviewOrder: "راجع طلبك",
    reviewOrderBody: "تحقق من التفاصيل قبل إرسال الطلب.",
    receiveOrder: "استلم طلبك",
    receiveOrderBody: "اختر الاستلام أو التوصيل حسب الخيارات المتاحة.",
    whyTitle: "لماذا Graduation Morocco؟",
    whyBody: "لأن يوم التخرج لا يتكرر، والتفاصيل الصغيرة هي التي تبقى في الذاكرة. نعمل على الجمع بين الهوية، التخصيص، والوضوح لتكون تجربتك أسهل وأكثر أناقة.",
    deliveryTitle: "الاستلام والتوصيل",
    deliverySubtitle: "نوضح لك خيار الاستلام أو التوصيل ضمن خطوات الطلب حسب الخيارات المتاحة في منطقتك.",
    pickup: "الاستلام",
    pickupBody: "يمكنك اختيار الاستلام إذا كان الخيار متاحًا.",
    deliveryBody: "عند اختيار التوصيل، أدخل العنوان الكامل والواضح.",
    readyTitle: "جاهز تبدأ؟",
    readyBody: "ابدأ طلبك الآن ودعنا نساعدك في جعل يوم تخرجك أكثر تميزًا.",
    footerTagline: "أناقة • تخصيص • تجربة تخرج تستحق الذكر",
    footerCredit: "تصميم وتطوير",
    menuLabel: "فتح القائمة",
    closeMenu: "إغلاق القائمة",
  },
  en: {
    home: "Home",
    newOrder: "New order",
    tracking: "Tracking",
    contact: "Contact",
    services: "Services",
    aboutUs: "About us",
    contactUs: "Contact us",
    startOrderNow: "Start your order",
    heroTitle: "Make your graduation day unforgettable",
    heroSubtitle: "Premium graduation wear, personalized stoles, and carefully crafted details for one of the most important moments of your university journey.",
    quality: "Quality",
    customization: "Customization",
    delivery: "Delivery",
    trustLine: "We bring every graduation detail together in one clear order, so you do not have to coordinate with several providers.",
    aboutSubtitle: "Graduation Morocco is more than graduation wear; we care about making every detail of your final university milestone worth remembering.",
    aboutHeadline: "A moment worth remembering.",
    aboutBody: "We design and provide graduation pieces that combine elegance, personalization, and Moroccan identity. Our goal is to make your experience simple from order to delivery, with genuine attention to detail.",
    aboutPills: ["Elegance", "Personalization", "Clarity", "Support"],
    servicesSubtitle: "Everything you need for a complete and elegant graduation look.",
    premiumIdentity: "Premium identity",
    premiumIdentityBody: "Navy and gold tones with elegant details inspired by the graduation experience.",
    clearCustomization: "Clear personalization",
    clearCustomizationBody: "We make sure each piece reflects your name, field of study, and personal details.",
    simpleExperience: "Simple experience",
    simpleExperienceBody: "Essential information is presented clearly so you always know the next step.",
    helpWhenNeeded: "Help when you need it",
    helpWhenNeededBody: "You can contact us whenever you need clarification before or after ordering.",
    processTitle: "How does ordering work?",
    processSubtitle: "Simple steps from choosing your product to receiving it.",
    chooseProduct: "Choose your product",
    chooseProductBody: "Browse the available products and choose what suits you.",
    setDetails: "Set the details",
    setDetailsBody: "Enter your size, personalization choices, and required information.",
    reviewOrder: "Review your order",
    reviewOrderBody: "Check every detail before submitting your order.",
    receiveOrder: "Receive your order",
    receiveOrderBody: "Choose pickup or delivery depending on the available options.",
    whyTitle: "Why Graduation Morocco?",
    whyBody: "Graduation day happens once, and the small details are what stay in your memory. We combine identity, personalization, and clarity to make your experience easier and more elegant.",
    deliveryTitle: "Pickup & delivery",
    deliverySubtitle: "Choose pickup or delivery during checkout according to the options available in your area.",
    pickup: "Pickup",
    pickupBody: "You can choose pickup whenever that option is available.",
    deliveryBody: "For delivery, enter a complete and clear address.",
    readyTitle: "Ready to begin?",
    readyBody: "Start your order now and let us help make your graduation day even more special.",
    footerTagline: "Elegance • Personalization • A graduation experience worth remembering",
    footerCredit: "Designed & developed by",
    menuLabel: "Open menu",
    closeMenu: "Close menu",
  },
} as const;

type IconName = "award" | "edit" | "eye" | "support" | "product" | "details" | "check" | "receive" | "pickup" | "truck" | "home" | "school" | "chat";

function AppIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    award: <><circle cx="12" cy="8" r="4" /><path d="m9.5 12-1 8 3.5-2 3.5 2-1-8" /></>,
    edit: <><path d="M4 20h4l11-11-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
    support: <><path d="M4 13v-2a8 8 0 0 1 16 0v2" /><path d="M4 13h3v6H5a1 1 0 0 1-1-1v-5Zm16 0h-3v6h2a1 1 0 0 0 1-1v-5ZM17 19c0 1.1-.9 2-2 2h-3" /></>,
    product: <><path d="M7 3h10l3 5-8 13L4 8l3-5Z" /><path d="M4 8h16M9 3l-1 5 4 13 4-13-1-5" /></>,
    details: <><path d="M4 5h16M4 12h16M4 19h16" /><circle cx="8" cy="5" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="10" cy="19" r="2" /></>,
    check: <><path d="M4 12.5 9 17l11-11" /><path d="M21 12a9 9 0 1 1-5.3-8.2" /></>,
    receive: <><path d="M3 7h12v10H3zM15 10h3l3 3v4h-6z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
    pickup: <><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    truck: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
    home: <><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    school: <><path d="m2 9 10-5 10 5-10 5L2 9Z" /><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v7" /></>,
    chat: <><path d="M21 12a8 8 0 0 1-8 8H5l-3 2 1-5a8 8 0 1 1 18-5Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></>,
  };

  return <svg className="appIcon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function HomePageClient() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [menuOpen, setMenuOpen] = useState(false);
  const t = copy[locale];
  const isArabic = locale === "ar";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
  }, [isArabic, locale]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const switchLocale = () => {
    setLocale(isArabic ? "en" : "ar");
    setMenuOpen(false);
  };

  const services = [
    ["award", t.premiumIdentity, t.premiumIdentityBody],
    ["edit", t.clearCustomization, t.clearCustomizationBody],
    ["eye", t.simpleExperience, t.simpleExperienceBody],
    ["support", t.helpWhenNeeded, t.helpWhenNeededBody],
  ] as const;

  const steps = [
    ["1", "product", t.chooseProduct, t.chooseProductBody],
    ["2", "details", t.setDetails, t.setDetailsBody],
    ["3", "check", t.reviewOrder, t.reviewOrderBody],
    ["4", "receive", t.receiveOrder, t.receiveOrderBody],
  ] as const;

  return (
    <div className="appHome" dir={isArabic ? "rtl" : "ltr"} lang={locale}>
      <header className="appHeader">
        <Link href="/" className="appLogo" aria-label={`Graduation Morocco — ${t.home}`}>
          <Image className="appLogoFull" src="/logo.png" width={180} height={62} alt="Graduation Morocco" priority />
          <Image className="appLogoMark" src="/logo_mark.png" width={52} height={52} alt="Graduation Morocco" priority />
        </Link>

        <nav className="appNav" aria-label={t.home}>
          <Link href="/">{t.home}</Link>
          <Link href="#services">{t.services}</Link>
          <Link href="#about">{t.aboutUs}</Link>
          <Link className="appContactButton" href="#contact"><AppIcon name="chat" />{t.contactUs}</Link>
          <button className="appLanguage" type="button" onClick={switchLocale} aria-label={isArabic ? "Switch to English" : "التبديل إلى العربية"}>{isArabic ? "EN" : "AR"}</button>
        </nav>

        <div className="appMobileHeaderActions">
          <button className="appLanguage" type="button" onClick={switchLocale} aria-label={isArabic ? "Switch to English" : "التبديل إلى العربية"}>{isArabic ? "EN" : "AR"}</button>
          <button className="appMenuIcon" type="button" onClick={() => setMenuOpen(true)} aria-label={t.menuLabel} aria-expanded={menuOpen} aria-controls="app-mobile-menu">☰</button>
        </div>
      </header>

      <main>
        <section className="appHero">
          <Image className="appHeroImage" src="/hero_graduation.png" alt="خريجة ترتدي بدلة ووشاح التخرج من Graduation Morocco" fill priority sizes="100vw" />
          <div className="appHeroOverlay" />
          <div className="appHeroCopy">
            <Image className="appHeroMark" src="/logo_mark.png" width={130} height={130} alt="" />
            <p className="appHeroBrand">GRADUATION MOROCCO</p>
            <h1>{t.heroTitle}</h1>
            <p className="appHeroSubtitle">{t.heroSubtitle}</p>
            <div className="appHeroActions">
              <Link className="appPrimaryButton" href="/order">{t.startOrderNow}</Link>
              <Link className="appOutlineLight" href="#contact">{t.contactUs}</Link>
            </div>
            <div className="appHeroBenefits">
              <span>{t.quality} ◈</span>
              <span>{t.customization} ✦</span>
              <span>{t.delivery} <AppIcon name="truck" /></span>
            </div>
          </div>
        </section>

        <section className="appTrust">{t.trustLine}</section>

        <section id="about" className="appSection">
          <div className="appSectionTitle"><h2>{t.aboutUs}</h2><p>{t.aboutSubtitle}</p></div>
          <div className="appAboutCard">
            <div className="appAboutLogo"><Image src="/logo.png" width={280} height={170} alt="Graduation Morocco" /></div>
            <div className="appAboutCopy">
              <h3>{t.aboutHeadline}</h3>
              <p>{t.aboutBody}</p>
              <div className="appPills">{t.aboutPills.map((pill) => <span key={pill}>{pill}</span>)}</div>
            </div>
          </div>
        </section>

        <section id="services" className="appSection">
          <div className="appSectionTitle"><h2>{t.services}</h2><p>{t.servicesSubtitle}</p></div>
          <div className="appServiceGrid">
            {services.map(([icon, title, body]) => (
              <article className="appServiceCard" key={title}>
                <div className="appServiceIcon"><AppIcon name={icon} /></div>
                <h3>{title}</h3><p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="appSection">
          <div className="appSectionTitle"><h2>{t.processTitle}</h2><p>{t.processSubtitle}</p></div>
          <div className="appSteps">
            {steps.map(([number, icon, title, body]) => (
              <article className="appStepCard" key={number}>
                <div className="appStepTop"><span className="appStepIcon"><AppIcon name={icon} /></span><span className="appStepNumber">{number}</span></div>
                <h3>{title}</h3><p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="appWhy"><h2>{t.whyTitle}</h2><p>{t.whyBody}</p></section>

        <section className="appSection">
          <div className="appSectionTitle"><h2>{t.deliveryTitle}</h2><p>{t.deliverySubtitle}</p></div>
          <div className="appDeliveryGrid">
            <article className="appDeliveryCard"><div className="appDeliveryIcon"><AppIcon name="pickup" /></div><h3>{t.pickup}</h3><p>{t.pickupBody}</p></article>
            <article className="appDeliveryCard"><div className="appDeliveryIcon"><AppIcon name="truck" /></div><h3>{t.delivery}</h3><p>{t.deliveryBody}</p></article>
          </div>
        </section>

        <section id="contact" className="appCta">
          <h2>{t.readyTitle}</h2><p>{t.readyBody}</p>
          <div className="appCtaActions"><Link className="appDarkButton" href="/order">{t.startOrderNow}</Link><Link className="appCtaSecondary" href="/track-order">{t.tracking}</Link></div>
        </section>
      </main>

      <footer className="appFooter">
        <Image src="/logo_mark.png" width={100} height={100} alt="" />
        <strong>Graduation Morocco</strong><p>{t.footerTagline}</p>
        <nav><Link href="#about">{t.aboutUs}</Link><Link href="#contact">{t.contactUs}</Link><Link href="/order">{t.startOrderNow}</Link></nav>
        <p className="appFooterCredit">{t.footerCredit} <span>MAQTA Studio</span></p>
      </footer>

      <nav className="appBottomNav" aria-label={t.home}>
        <Link href="/"><AppIcon name="home" />{t.home}</Link>
        <Link href="/order"><AppIcon name="school" />{t.newOrder}</Link>
        <Link href="/track-order"><AppIcon name="truck" />{t.tracking}</Link>
        <Link href="#contact"><AppIcon name="support" />{t.contact}</Link>
      </nav>

      {menuOpen && (
        <div className="appMenuBackdrop" role="presentation" onMouseDown={() => setMenuOpen(false)}>
          <div id="app-mobile-menu" className="appMobileMenu" role="dialog" aria-modal="true" aria-label={t.menuLabel} onMouseDown={(event) => event.stopPropagation()}>
            <div className="appMobileMenuHead"><strong>Graduation Morocco</strong><button type="button" onClick={() => setMenuOpen(false)} aria-label={t.closeMenu}>×</button></div>
            <nav>
              <Link href="/" onClick={() => setMenuOpen(false)}>{t.home}<span>‹</span></Link>
              <Link href="#about" onClick={() => setMenuOpen(false)}>{t.aboutUs}<span>‹</span></Link>
              <Link href="#services" onClick={() => setMenuOpen(false)}>{t.services}<span>‹</span></Link>
              <Link href="#contact" onClick={() => setMenuOpen(false)}>{t.contactUs}<span>‹</span></Link>
            </nav>
            <Link className="appMobileOrder" href="/order">{t.startOrderNow}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
