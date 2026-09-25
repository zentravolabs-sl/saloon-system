import Link from "next/link";
import { Scissors, ShieldCheck, Clock, MapPin, Sparkles, Phone, Mail, ArrowUpRight } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#06070D] text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
                <Scissors className="w-5 h-5 transform -rotate-45" />
              </div>
              <span className="font-heading text-xl font-black text-white tracking-tight">Zentravo</span>
            </Link>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Enterprise multi-tenant salon booking & resource management SaaS platform. Built for zero double-bookings.
            </p>
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium">All Systems Operational</span>
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-white mb-4">
              Explore Platform
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Platform Overview
                </Link>
              </li>
              <li>
                <Link href="/salons" className="hover:text-white transition-colors">
                  Browse Salons & Studios
                </Link>
              </li>
              <li>
                <Link href="/booking" className="hover:text-white transition-colors">
                  Book an Appointment
                </Link>
              </li>
              <li>
                <Link href="/booking/lookup" className="hover:text-white transition-colors">
                  Look Up Appointment Status
                </Link>
              </li>
              <li>
                <Link href="/customer/login" className="hover:text-white transition-colors">
                  Customer Portal (Mobile OTP)
                </Link>
              </li>
            </ul>
          </div>

          {/* Salon Operations */}
          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-white mb-4">
              For Salon Owners
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/auth/register" className="hover:text-white transition-colors">
                  Register Your Salon
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-white transition-colors">
                  Salon Admin Portal
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-white transition-colors">
                  Stylist & Staff Login
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-white transition-colors">
                  Super Admin Management
                </Link>
              </li>
            </ul>
          </div>

          {/* Demo Credentials Card */}
          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-white mb-4">
              Demo Credentials
            </h4>
            <div className="text-xs space-y-3 bg-[#111322] p-4 rounded-2xl border border-white/[0.08]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 block mb-0.5">
                  Super Admin
                </span>
                <p className="font-mono text-[11px] text-zinc-300 select-all">admin@zentravo.com</p>
                <p className="font-mono text-[11px] text-zinc-400">Admin@123</p>
              </div>

              <div className="pt-2 border-t border-white/[0.06]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-300 block mb-0.5">
                  Glamour Cuts (Multi-Branch)
                </span>
                <p className="font-mono text-[11px] text-zinc-300 select-all">rajesh@glamourcuts.lk</p>
                <p className="font-mono text-[11px] text-zinc-400">Admin@123</p>
              </div>

              <div className="pt-2">
                <Link
                  href="/auth/login"
                  className="w-full py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <span>Quick Login</span>
                  <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <p>© {new Date().getFullYear()} Zentravo SaaS Platform. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6">
            <span>PostgreSQL Advisory Locks</span>
            <span>Real-Time Availability</span>
            <span>Multi-Tenant Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
