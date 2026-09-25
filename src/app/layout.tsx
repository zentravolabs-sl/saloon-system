import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
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
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable} dark`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-[#080911] text-[#F9FAFB] min-h-screen selection:bg-[#8B5CF6]/30 selection:text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
