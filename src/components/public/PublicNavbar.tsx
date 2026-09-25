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
    <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#080911]/90 border-b border-white/[0.08] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Emblem */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-500 to-pink-500 p-[1px] shadow-lg shadow-violet-600/30 group-hover:shadow-violet-600/50 transition-all duration-300">
              <div className="w-full h-full rounded-[15px] bg-[#0E101D] flex items-center justify-center group-hover:bg-opacity-80 transition-colors">
                <Scissors className="w-5 h-5 text-violet-300 transform -rotate-45 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#080911]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-xl font-extrabold tracking-tight text-white group-hover:text-violet-300 transition-colors">
                Zentravo
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                SaaS
              </span>
            </div>
            <p className="text-[11px] font-medium tracking-wide text-zinc-400">Salon & Barber Cloud</p>
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
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-violet-600/20 text-violet-300 border border-violet-500/30 shadow-sm"
                    : "text-zinc-300 hover:text-white hover:bg-white/[0.06] border border-transparent"
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
                  : "/admin/dashboard"
              }
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg shadow-violet-600/25 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </Link>
          ) : (
            <>
              <Link
                href="/customer/login"
                className="hidden xl:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-pink-300 hover:text-white bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/25 transition-all"
              >
                <span>Customer Portal</span>
              </Link>
              <Link
                href="/auth/login"
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors border border-white/[0.08] hover:border-white/20 flex items-center gap-2"
              >
                <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                <span>Salon Portal</span>
              </Link>
              <Link
                href="/booking"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-violet-600/30 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
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
          className="lg:hidden p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white focus:outline-none"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/[0.08] bg-[#0E101D] px-4 pt-4 pb-6 space-y-3">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                      : "text-zinc-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-white/[0.08] flex flex-col gap-2">
            {session ? (
              <Link
                href={
                  session.user.role === "SUPER_ADMIN"
                    ? "/super-admin/dashboard"
                    : "/admin/dashboard"
                }
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl text-center text-xs font-bold bg-violet-600 text-white"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/customer/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl text-center text-xs font-semibold text-pink-300 bg-pink-500/10 border border-pink-500/20"
                >
                  Customer Login (Mobile OTP)
                </Link>
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl text-center text-xs font-semibold text-zinc-300 bg-white/5 border border-white/10"
                >
                  Salon Portal Login
                </Link>
                <Link
                  href="/booking"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl text-center text-xs font-bold bg-gradient-to-r from-violet-600 to-pink-600 text-white"
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
