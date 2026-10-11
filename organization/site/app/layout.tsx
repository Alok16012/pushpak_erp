import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Sora, Noto_Sans_Devanagari } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import WhatsappButton from "@/components/WhatsappButton";
import { site } from "@/lib/site";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Sora({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display", display: "swap" });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "600", "700"], variable: "--font-deva", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${site.fullName} — Computer & Digital Skills Courses`, template: `%s | ${site.name}` },
  description: site.description,
  icons: { icon: "/logo.png", apple: "/logo.png" },
  openGraph: { siteName: site.fullName, type: "website", images: ["/logo.png"] },
};

export const viewport: Viewport = { themeColor: "#1e3a9e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${deva.variable}`}>
      <body className="font-sans">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <WhatsappButton />
      </body>
    </html>
  );
}
