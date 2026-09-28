import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { getAdSensePubId, isAdsEnabled, getConfigValue } from "@/lib/site-config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FresherPortal — Verified Off-Campus Drives & Fresher Jobs",
  description:
    "Curated fresher, off-campus jobs and internships across top tech companies in India. Direct ATS career links, zero duplicates, verified daily.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Load AdSense config from DB
  let adsPubId = "";
  let adsEnabled = false;
  let autoAds = false;

  try {
    adsPubId = await getAdSensePubId();
    adsEnabled = await isAdsEnabled();
    autoAds = (await getConfigValue("auto_ads_enabled", "false")) === "true";
  } catch {
    // DB not available, ads disabled
  }

  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Google AdSense script — only loaded when publisher ID is set and ads are enabled */}
        {adsEnabled && adsPubId && (
          <>
            <meta name="google-adsense-account" content={adsPubId} />
            <Script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsPubId}`}
              crossOrigin="anonymous"
              strategy="afterInteractive"
            />
            {autoAds && (
              <Script id="adsense-auto" strategy="afterInteractive">
                {`(adsbygoogle = window.adsbygoogle || []).push({google_ad_client: "${adsPubId}", enable_page_level_ads: true});`}
              </Script>
            )}
          </>
        )}
      </head>
      <body className="min-h-screen bg-[#FAFAF7] text-[#0F1729] antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
