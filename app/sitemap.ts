import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://graduationmorocco.ma";
  const now = new Date();

  return [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/order`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/group-orders`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/graduation-gowns`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/graduation-gowns-rental`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/custom-graduation-stoles`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/track-order`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
