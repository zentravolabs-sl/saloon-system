import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

const plusJakarta = localFont({
  src: "./fonts/PlusJakartaSans-Variable.woff2",
  variable: "--font-plus-jakarta",
  weight: "200 800",
  display: "swap",
});

const inter = localFont({
  src: "./fonts/Inter-Variable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zentravo | Enterprise Multi-Tenant Salon SaaS Platform",
  description:
    "The modern salon booking and enterprise operations platform. Multi-tenant, multi-branch, real-time availability engine, and zero double bookings.",
  keywords: [
    "salon booking",
    "appointment booking",
    "salon management",
    "barber booking",
    "beauty salon",
    "SaaS",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakarta.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans antialiased bg-[#EEF0F9] text-[#0F172A] min-h-screen selection:bg-[#7C3AED]/20 selection:text-[#0F172A]"
        style={{
          background:
            "radial-gradient(circle at 10% 10%, #F5F3FF 0%, #EEF0F9 45%, #E9ECF8 100%)",
        }}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
