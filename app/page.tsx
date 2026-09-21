import HomePageClient from "@/components/HomePageClient";

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

      <HomePageClient />
    </>
  );
}
