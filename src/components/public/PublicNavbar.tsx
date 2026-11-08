"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scissors, Calendar, LogIn, Sparkles, Menu, X } from "lucide-react";
import { useSession } from "next-auth/react";

export function PublicNavbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/salons", label: "Salons" },
    { href: "/booking", label: "Book Slot" },
    { href: "/booking/lookup", label: "Lookup" },
    { href: "/customer/bookings", label: "My Bookings" },
  ];

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/customer/bookings") return pathname?.startsWith("/customer");
    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/75 border-b border-white/80 shadow-[0_4px_18px_rgba(15,23,42,0.03)] transition-all">
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Emblem (Matches HomePage) */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-[#A855F7] via-[#7C3AED] to-[#6D28D9] flex items-center justify-center text-white shadow-[0_6px_16px_rgba(124,58,237,0.32)] shrink-0 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1/2 bg-white/15 rounded-t-[14px]" />
            <Scissors className="w-5 h-5 -rotate-90 relative z-10" strokeWidth={2.2} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[22px] font-extrabold text-[#0F172A] tracking-tight leading-none">
                Zentravo
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#5B21B6] text-white leading-none">
                SaaS
              </span>
            </div>
            <p className="text-[12px] font-medium text-[#475569] mt-1 leading-none">
              Salon &amp; Barber Cloud
            </p>
          </div>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden lg:flex items-center gap-2">
          {navLinks.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-[0_4px_12px_rgba(124,58,237,0.28)]"
                    : "text-[#334155] hover:text-[#6D28D9] hover:bg-white/90 border border-transparent"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {session ? (
            <Link
              href={
                session.user.role === "SUPER_ADMIN"
                  ? "/super-admin/dashboard"
                  : "/admin"
              }
              className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-[0_6px_16px_rgba(124,58,237,0.28)] hover:brightness-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </Link>
          ) : (
            <>
              <Link
                href="/customer/login"
                className="hidden xl:flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold text-[#6D28D9] hover:text-[#5B21B6] bg-[#EDE9FE] hover:bg-[#DDD6FE] border border-[#DDD6FE] transition-all"
              >
                <span>Customer Portal</span>
              </Link>
              <Link
                href="/auth/login"
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-[#0F172A] hover:text-[#6D28D9] bg-white/95 hover:bg-white transition-colors border border-white shadow-[0_4px_18px_rgba(15,23,42,0.04)] flex items-center gap-2"
              >
                <LogIn className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>Salon Portal</span>
              </Link>
              <Link
                href="/booking"
                className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-[0_6px_16px_rgba(124,58,237,0.28)] hover:brightness-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Book Appointment</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2.5 rounded-2xl bg-white/95 border border-white shadow-[0_4px_18px_rgba(15,23,42,0.04)] text-[#0F172A] hover:text-[#6D28D9] focus:outline-none"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E2E8F0] bg-white/95 backdrop-blur-md px-4 pt-4 pb-6 space-y-3 shadow-lg">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    active
                      ? "bg-[#EDE9FE] text-[#6D28D9]"
                      : "text-[#334155] hover:bg-[#F8FAFC] hover:text-[#6D28D9]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-[#E2E8F0] flex flex-col gap-2">
            {session ? (
              <Link
                href={
                  session.user.role === "SUPER_ADMIN"
                    ? "/super-admin/dashboard"
                    : "/admin"
                }
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl text-center text-xs font-bold bg-[#7C3AED] text-white"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/customer/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl text-center text-xs font-bold text-[#6D28D9] bg-[#EDE9FE] border border-[#DDD6FE]"
                >
                  Customer Login (Mobile OTP)
                </Link>
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl text-center text-xs font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0]"
                >
                  Salon Portal Login
                </Link>
                <Link
                  href="/booking"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl text-center text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white"
                >
                  Book Appointment Now
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
