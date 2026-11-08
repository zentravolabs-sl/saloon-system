import Link from "next/link";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import { HeroSearchWidget } from "@/components/public/HeroSearchWidget";
import { prisma } from "@/lib/prisma";
import {
  Scissors,
  Calendar,
  Clock,
  MapPin,
  Star,
  Shield,
  ArrowRight,
  CheckCircle2,
  Users,
  Building2,
  Search,
  Lock,
  Layers,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let salons: any[] = [];
  let totalSalons = 0;
  let totalBranches = 0;
  let totalStaff = 0;
  let totalBookings = 0;

  try {
    const [fetchedSalons, stats] = await Promise.all([
      prisma.salon.findMany({
        where: { status: "APPROVED" },
        include: {
          branches: {
            where: { status: "ACTIVE" },
            select: { id: true, name: true, city: true, address: true },
          },
          services: {
            where: { isActive: true },
            take: 4,
            select: { id: true, name: true, price: true, duration: true },
          },
          _count: { select: { staff: true, bookings: true, branches: true } },
        },
        take: 6,
        orderBy: { createdAt: "desc" },
      }),
      Promise.all([
        prisma.salon.count({ where: { status: "APPROVED" } }),
        prisma.branch.count({ where: { status: "ACTIVE" } }),
        prisma.staff.count({ where: { status: "ACTIVE" } }),
        prisma.booking.count(),
      ]),
    ]);

    salons = fetchedSalons;
    totalSalons = stats[0];
    totalBranches = stats[1];
    totalStaff = stats[2];
    totalBookings = stats[3];
  } catch (err) {
    console.error("HomePage data load error:", err);
  }

  const searchSalonsData = salons.map((s) => ({
    id: s.id,
    name: s.name,
    city: s.city ?? null,
    branches: s.branches.map((b: any) => ({
      id: b.id,
      name: b.name,
      city: b.city ?? null,
    })),
  }));

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[#0F172A] selection:bg-violet-500/30">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 lg:pt-20 lg:pb-32">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-tr from-violet-500/15 via-pink-500/10 to-transparent blur-[140px] pointer-events-none -z-10" />
        <div className="absolute top-40 right-[-100px] w-[450px] h-[450px] bg-cyan-500/10 blur-[130px] pointer-events-none -z-10" />
        <div className="absolute top-60 left-[-150px] w-[450px] h-[450px] bg-purple-600/10 blur-[140px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-white text-xs font-bold text-[#6D28D9] backdrop-blur-xl shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Next-Gen Salon Availability Engine · Multi-Tenant Platform</span>
            </div>

            {/* Headline */}
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] text-[#0F172A] max-w-3xl mx-auto">
              Effortless Salon Booking.{" "}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] via-[#DB2777] to-[#D97706] mt-1">
                Zero Double Bookings.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-lg text-[#475569] max-w-2xl mx-auto leading-relaxed font-medium">
              Book certified hair stylists, barbers, and aesthetic spas in seconds.
              Powered by real-time slot synchronization, buffer-time intelligence, and PostgreSQL concurrency locks.
            </p>

            {/* Interactive Live Booking Search Widget */}
            <div className="my-8">
              <HeroSearchWidget salons={searchSalonsData} />
            </div>

            {/* Quick Demo Credentials & Direct Access Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5 text-xs">
              <span className="text-[#64748B] font-bold">Quick Demo Access:</span>
              <Link
                href="/auth/login"
                className="px-3.5 py-1.5 rounded-xl bg-white/95 hover:bg-white text-[#6D28D9] border border-white shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all font-bold flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>Super Admin</span>
              </Link>
              <Link
                href="/auth/login"
                className="px-3.5 py-1.5 rounded-xl bg-white/95 hover:bg-white text-[#DB2777] border border-white shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all font-bold flex items-center gap-1.5"
              >
                <Scissors className="w-3.5 h-3.5 text-[#EC4899]" />
                <span>Glamour Cuts Owner</span>
              </Link>
              <Link
                href="/admin/dashboard"
                className="px-3.5 py-1.5 rounded-xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#5B21B6] border border-[#DDD6FE] transition-all font-bold flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5 text-[#6D28D9]" />
                <span>Admin Dashboard</span>
              </Link>
              <Link
                href="/booking/lookup"
                className="px-3.5 py-1.5 rounded-xl bg-white/95 hover:bg-white text-[#15803D] border border-white shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all font-bold flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Look Up Booking</span>
              </Link>
            </div>
          </div>

          {/* Unified Platform Metrics Bar */}
          <div className="mt-16 max-w-5xl mx-auto rounded-3xl bg-white/95 border border-white backdrop-blur-xl shadow-[0_12px_36px_rgba(15,23,42,0.05)] p-6 sm:p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 text-[#7C3AED] mb-1">
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs uppercase font-bold tracking-wider text-[#64748B]">Salons</span>
                </div>
                <p className="font-heading text-3xl sm:text-4xl font-black text-[#0F172A]">{totalSalons}</p>
                <p className="text-xs text-[#64748B] font-medium">Approved Studios</p>
              </div>

              <div className="space-y-1 pt-4 md:pt-0">
                <div className="flex items-center justify-center gap-2 text-[#DB2777] mb-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs uppercase font-bold tracking-wider text-[#64748B]">Locations</span>
                </div>
                <p className="font-heading text-3xl sm:text-4xl font-black text-[#0F172A]">{totalBranches}</p>
                <p className="text-xs text-[#64748B] font-medium">Active Branches</p>
              </div>

              <div className="space-y-1 pt-4 md:pt-0">
                <div className="flex items-center justify-center gap-2 text-[#0284C7] mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs uppercase font-bold tracking-wider text-[#64748B]">Stylists</span>
                </div>
                <p className="font-heading text-3xl sm:text-4xl font-black text-[#0F172A]">{totalStaff}</p>
                <p className="text-xs text-[#64748B] font-medium">Verified Barbers</p>
              </div>

              <div className="space-y-1 pt-4 md:pt-0">
                <div className="flex items-center justify-center gap-2 text-[#D97706] mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs uppercase font-bold tracking-wider text-[#64748B]">Appointments</span>
                </div>
                <p className="font-heading text-3xl sm:text-4xl font-black text-[#0F172A]">{totalBookings}+</p>
                <p className="text-xs text-[#64748B] font-medium">Processed Bookings</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Salons Section */}
      <section className="py-24 border-t border-white/80 bg-white/40 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-[#6D28D9] text-xs font-bold uppercase tracking-wider border border-violet-500/20">
                <Scissors className="w-3.5 h-3.5" />
                <span>Featured Studios &amp; Spas</span>
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#0F172A]">
                Popular Salons &amp; Studios
              </h2>
              <p className="text-[#64748B] text-sm max-w-xl">
                Select your preferred salon to inspect branch amenities, service pricing, and book your dedicated stylist.
              </p>
            </div>

            <Link
              href="/salons"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#6D28D9] border border-[#E2E8F0] shadow-xs text-sm font-bold transition-all group shrink-0"
            >
              <span>View All Salons</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div
            className={`grid grid-cols-1 md:grid-cols-2 ${
              salons.length >= 3 ? "lg:grid-cols-3" : "max-w-5xl mx-auto"
            } gap-8`}
          >
            {salons.map((salon) => {
              const avgRating = "4.9";

              return (
                <div
                  key={salon.id}
                  className="rounded-3xl bg-white border border-[#E2E8F0] hover:border-violet-500/40 p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-600/10 group"
                >
                  <div className="space-y-5">
                    {/* Header: Monogram Avatar + Rating Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-600 p-[1px] shadow-lg shadow-violet-600/30">
                          <div className="w-full h-full rounded-[15px] bg-white flex items-center justify-center text-[#0F172A] font-heading font-black text-xl">
                            {salon.name.charAt(0)}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-heading text-lg font-bold text-[#0F172A] group-hover:text-[#6D28D9] transition-colors leading-tight">
                            {salon.name}
                          </h3>
                          <span className="text-xs text-[#64748B] flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Verified Salon Partner</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[#D97706] text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-[#D97706]" />
                        <span>{avgRating}</span>
                        <span className="text-[#64748B] font-normal">(24)</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                      {salon.description}
                    </p>

                    {/* Branches tags */}
                    <div className="flex items-start gap-2 text-xs text-[#334155] bg-[#F8FAFC] p-3 rounded-xl border border-[#EEF2F6]">
                      <MapPin className="w-4 h-4 text-[#DB2777] shrink-0 mt-0.5" />
                      <div className="truncate">
                        <span className="text-[#64748B] text-[11px] block">Locations:</span>
                        <span className="font-semibold text-[#0F172A] truncate">
                          {salon.branches?.map((b: any) => b.name).join(" • ") || salon.city}
                        </span>
                      </div>
                    </div>

                    {/* Services preview */}
                    {salon.services && salon.services.length > 0 ? (
                      <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                        <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                          Popular Services
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {salon.services?.map((srv: any) => (
                            <span
                              key={srv.id}
                              className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] text-[11px] text-[#334155] font-medium border border-[#E2E8F0]"
                            >
                              {srv.name} · <strong className="text-[#0F172A]">LKR {srv.price?.toLocaleString()}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-[#F1F5F9] text-xs text-[#64748B] italic">
                        Bespoke styling &amp; grooming packages available on booking.
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons */}
                  <div className="pt-6 mt-6 border-t border-[#F1F5F9] flex items-center gap-3">
                    <Link
                      href={`/salons/${salon.slug}`}
                      className="flex-1 py-3 rounded-xl text-xs font-bold text-center bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] transition-all"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/booking?salonId=${salon.id}`}
                      className="flex-1 py-3 rounded-xl text-xs font-bold text-center bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-md shadow-violet-600/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book Now</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Engineering Architecture Section */}
      <section className="py-24 border-t border-white/80 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-[#6D28D9] text-xs font-bold uppercase tracking-wider border border-violet-500/20">
              <Zap className="w-3.5 h-3.5" />
              <span>Core Reliability Infrastructure</span>
            </div>
            <h2 className="font-heading text-3xl sm:text-5xl font-black text-[#0F172A]">
              Architected for Precision Booking
            </h2>
            <p className="text-[#475569] text-base leading-relaxed">
              A high-concurrency availability engine that synchronizes branches, staff working schedules, leaves, and buffer periods without race conditions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-white/95 border border-white shadow-[0_8px_28px_rgba(15,23,42,0.04)] hover:border-violet-500/40 transition-all duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED] group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-xl font-bold text-[#0F172A]">Real-Time Slot Engine</h3>
              <p className="text-sm text-[#475569] leading-relaxed">
                Dynamically computes available appointment intervals factoring in custom service duration, cleanup buffer times, lunch breaks, and holiday emergency closures.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white/95 border border-white shadow-[0_8px_28px_rgba(15,23,42,0.04)] hover:border-pink-500/40 transition-all duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-[#FCE7F3] border border-[#FBCFE8] flex items-center justify-center text-[#DB2777] group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-xl font-bold text-[#0F172A]">Zero Double Bookings</h3>
              <p className="text-sm text-[#475569] leading-relaxed">
                PostgreSQL transactional isolation locks slot generation at confirmation via advisory locks, serialized locks, and strict overlap assertions.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white/95 border border-white shadow-[0_8px_28px_rgba(15,23,42,0.04)] hover:border-cyan-500/40 transition-all duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] border border-[#BAE6FD] flex items-center justify-center text-[#0284C7] group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-xl font-bold text-[#0F172A]">Multi-Tenant Isolation</h3>
              <p className="text-sm text-[#475569] leading-relaxed">
                Every salon operates autonomously with isolated branch schedules, customized service menus, staff commissions, and customer CRM records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Lookup & Self-Service Section */}
      <section className="py-24 border-t border-white/80 bg-white/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-xs font-bold border border-[#BBF7D0]">
            <CheckCircle2 className="w-4 h-4" />
            <span>Self-Service Customer Portal</span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#0F172A]">
            Track or Reschedule Your Booking
          </h2>

          <p className="text-[#475569] text-sm sm:text-base max-w-xl mx-auto">
            Look up your appointment status anytime without a password using your mobile number and unique booking reference code.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/booking/lookup"
              className="px-6 py-3.5 rounded-xl font-heading font-bold text-sm bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] shadow-xs transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4 text-[#7C3AED]" />
              <span>Go to Booking Lookup</span>
            </Link>
            <Link
              href="/customer/login"
              className="px-6 py-3.5 rounded-xl font-heading font-bold text-sm text-[#6D28D9] hover:bg-[#F5F3FF] transition-colors"
            >
              <span>Login with Mobile Number →</span>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
