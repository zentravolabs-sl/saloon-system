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
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  Building2,
  TrendingUp,
  Receipt,
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
    <div className="min-h-screen flex flex-col bg-[#080911] text-white selection:bg-violet-500/30">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-28 lg:pt-20 lg:pb-36">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-tr from-violet-600/20 via-pink-600/15 to-transparent blur-[140px] pointer-events-none -z-10" />
        <div className="absolute top-40 right-[-100px] w-[450px] h-[450px] bg-cyan-500/10 blur-[130px] pointer-events-none -z-10" />
        <div className="absolute top-60 left-[-150px] w-[450px] h-[450px] bg-purple-600/10 blur-[140px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs font-semibold text-violet-300 backdrop-blur-xl shadow-lg shadow-violet-500/5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Next-Gen Salon Availability Engine · Multi-Tenant Platform</span>
            </div>

            {/* Headline */}
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] text-white max-w-3xl mx-auto">
              Effortless Salon Booking.{" "}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 mt-1">
                Zero Double Bookings.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal">
              Book certified hair stylists, barbers, and aesthetic spas in seconds.
              Powered by real-time slot synchronization, buffer-time intelligence, and PostgreSQL concurrency locks.
            </p>

            {/* Interactive Live Booking Search Widget */}
            <div className="my-8">
              <HeroSearchWidget salons={searchSalonsData} />
            </div>

            {/* Quick Demo Credentials & Direct Access Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5 text-xs">
              <span className="text-zinc-400 font-medium">Quick Demo Access:</span>
              <Link
                href="/auth/login"
                className="px-3.5 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/25 transition-all font-semibold flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-violet-400" />
                <span>Super Admin</span>
              </Link>
              <Link
                href="/auth/login"
                className="px-3.5 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/25 transition-all font-semibold flex items-center gap-1.5"
              >
                <Scissors className="w-3.5 h-3.5 text-pink-400" />
                <span>Glamour Cuts Owner</span>
              </Link>
              <Link
                href="/booking/lookup"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 transition-all font-semibold flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5 text-emerald-400" />
                <span>Look Up Booking</span>
              </Link>
            </div>
          </div>

          {/* Unified Platform Metrics Bar */}
          <div className="mt-20 max-w-5xl mx-auto rounded-3xl bg-[#10121F]/80 border border-white/[0.08] backdrop-blur-xl shadow-2xl p-6 sm:p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 text-violet-400 mb-1">
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">Salons</span>
                </div>
                <p className="font-heading text-3xl sm:text-4xl font-black text-white">{totalSalons}</p>
                <p className="text-xs text-zinc-400 font-medium">Approved Studios</p>
              </div>

              <div className="space-y-1 pt-4 md:pt-0">
                <div className="flex items-center justify-center gap-2 text-pink-400 mb-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">Locations</span>
                </div>
                <p className="font-heading text-3xl sm:text-4xl font-black text-white">{totalBranches}</p>
                <p className="text-xs text-zinc-400 font-medium">Active Branches</p>
              </div>

              <div className="space-y-1 pt-4 md:pt-0">
                <div className="flex items-center justify-center gap-2 text-cyan-400 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">Stylists</span>
                </div>
                <p className="font-heading text-3xl sm:text-4xl font-black text-white">{totalStaff}</p>
                <p className="text-xs text-zinc-400 font-medium">Verified Barbers</p>
              </div>

              <div className="space-y-1 pt-4 md:pt-0">
                <div className="flex items-center justify-center gap-2 text-amber-400 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">Appointments</span>
                </div>
                <p className="font-heading text-3xl sm:text-4xl font-black text-white">{totalBookings}+</p>
                <p className="text-xs text-zinc-400 font-medium">Processed Bookings</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Salons Section */}
      <section className="py-28 border-t border-white/[0.08] bg-[#0A0C16]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-300 text-xs font-bold uppercase tracking-wider border border-violet-500/20">
                <Scissors className="w-3.5 h-3.5" />
                <span>Featured Studios & Spas</span>
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
                Popular Salons & Studios
              </h2>
              <p className="text-zinc-400 text-sm max-w-xl">
                Select your preferred salon to inspect branch amenities, service pricing, and book your dedicated stylist.
              </p>
            </div>

            <Link
              href="/salons"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-violet-300 hover:text-white border border-white/[0.08] text-sm font-semibold transition-all group shrink-0"
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
                  className="rounded-3xl bg-[#111322] border border-white/[0.08] hover:border-violet-500/40 p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-600/10 group"
                >
                  <div className="space-y-5">
                    {/* Header: Monogram Avatar + Rating Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-600 p-[1px] shadow-lg shadow-violet-600/30">
                          <div className="w-full h-full rounded-[15px] bg-[#0E101D] flex items-center justify-center text-white font-heading font-black text-xl">
                            {salon.name.charAt(0)}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-heading text-lg font-bold text-white group-hover:text-violet-300 transition-colors leading-tight">
                            {salon.name}
                          </h3>
                          <span className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Verified Salon Partner</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{avgRating}</span>
                        <span className="text-white/40 font-normal">(24)</span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {salon.description}
                    </p>

                    {/* Branches tags */}
                    <div className="flex items-start gap-2 text-xs text-zinc-300 bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                      <MapPin className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                      <div className="truncate">
                        <span className="text-zinc-400 text-[11px] block">Locations:</span>
                        <span className="font-medium text-white truncate">
                          {salon.branches?.map((b: any) => b.name).join(" • ") || salon.city}
                        </span>
                      </div>
                    </div>

                    {/* Services preview */}
                    {salon.services && salon.services.length > 0 ? (
                      <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                          Popular Services
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {salon.services?.map((srv: any) => (
                            <span
                              key={srv.id}
                              className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-[11px] text-zinc-300 font-medium border border-white/[0.06]"
                            >
                              {srv.name} · <strong className="text-white">LKR {srv.price?.toLocaleString()}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-white/[0.06] text-xs text-zinc-400 italic">
                        Bespoke styling & grooming packages available on booking.
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons */}
                  <div className="pt-6 mt-6 border-t border-white/[0.08] flex items-center gap-3">
                    <Link
                      href={`/salons/${salon.slug}`}
                      className="flex-1 py-3 rounded-xl text-xs font-semibold text-center bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] hover:border-white/20 transition-all"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/booking?salonId=${salon.id}`}
                      className="flex-1 py-3 rounded-xl text-xs font-bold text-center bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white shadow-md shadow-violet-600/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
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
      <section className="py-28 border-t border-white/[0.08] bg-[#080911] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-violet-600/10 blur-[160px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-300 text-xs font-bold uppercase tracking-wider border border-violet-500/20">
              <Zap className="w-3.5 h-3.5" />
              <span>Core Reliability Infrastructure</span>
            </div>
            <h2 className="font-heading text-3xl sm:text-5xl font-black text-white">
              Architected for Precision Booking
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed">
              A high-concurrency availability engine that synchronizes branches, staff working schedules, leaves, and buffer periods without race conditions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-[#10121F]/90 border border-white/[0.08] hover:border-violet-500/40 transition-all duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-xl font-bold text-white">Real-Time Slot Engine</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Dynamically computes available appointment intervals factoring in custom service duration, cleanup buffer times, lunch breaks, and holiday emergency closures.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#10121F]/90 border border-white/[0.08] hover:border-pink-500/40 transition-all duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-xl font-bold text-white">Zero Double Bookings</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                PostgreSQL transactional isolation locks slot generation at confirmation via advisory locks, serialized locks, and strict overlap assertions.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#10121F]/90 border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-xl font-bold text-white">Multi-Tenant Isolation</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Every salon operates autonomously with isolated branch schedules, customized service menus, staff commissions, and customer CRM records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Lookup & Self-Service Section */}
      <section className="py-24 border-t border-white/[0.08] bg-gradient-to-b from-[#0A0C16] to-[#080911]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
            <span>Self-Service Customer Portal</span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Track or Reschedule Your Booking
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto">
            Look up your appointment status anytime without a password using your mobile number and unique booking reference code.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/booking/lookup"
              className="px-6 py-3.5 rounded-xl font-heading font-bold text-sm bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.12] hover:border-white/25 transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4 text-violet-400" />
              <span>Go to Booking Lookup</span>
            </Link>
            <Link
              href="/customer/login"
              className="px-6 py-3.5 rounded-xl font-heading font-semibold text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
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
