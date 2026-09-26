import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import { prisma } from "@/lib/prisma";
import {
  Scissors,
  MapPin,
  Clock,
  Phone,
  Mail,
  Users,
  ChevronLeft,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function SalonBranchesDirectoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const salon = await prisma.salon.findUnique({
    where: { slug },
    include: {
      branches: {
        where: { status: "ACTIVE" },
        include: {
          schedules: { orderBy: { dayOfWeek: "asc" } },
          _count: { select: { staff: true, bookings: true } },
          services: {
            where: { isActive: true },
            include: { service: { select: { name: true, price: true } } },
            take: 4,
          },
        },
      },
    },
  });

  if (!salon || salon.status !== "APPROVED") {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0B14] text-white">
      <PublicNavbar />

      {/* Hero / Header */}
      <section className="relative overflow-hidden pt-12 pb-14 border-b border-[var(--border)] bg-[#0C0E1A]">
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-[#8B5CF6]/15 blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <Link
              href={`/salons/${salon.slug}`}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to {salon.name} Overview</span>
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30">
                    Locations Directory
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {salon.branches.length} Active {salon.branches.length === 1 ? "Branch" : "Branches"}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {salon.name} Branches
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xl">
                  Explore our verified branch locations, view localized operating schedules, and book an appointment with your preferred stylist.
                </p>
              </div>

              <Link
                href={`/booking?salonId=${salon.id}`}
                className="px-6 py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-lg shadow-[#8B5CF6]/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>Book Any Branch</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Branches Grid */}
      <section className="py-12 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {salon.branches.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <MapPin className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
              <h3 className="text-lg font-bold text-white">No Branches Available</h3>
              <p className="text-xs text-[var(--text-muted)]">
                This salon currently has no public branch locations listed.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {salon.branches.map((branch: (typeof salon.branches)[number]) => {
                const todayDayOfWeek = new Date().getDay();
                const todaySchedule = branch.schedules.find(
                  (s: (typeof branch.schedules)[number]) => s.dayOfWeek === todayDayOfWeek
                );

                return (
                  <div
                    key={branch.id}
                    className="p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-6 relative overflow-hidden group shadow-xl"
                  >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-[#8B5CF6]/10 blur-3xl pointer-events-none group-hover:bg-[#8B5CF6]/20 transition-colors" />

                    <div className="space-y-5">
                      {/* Branch Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-white">{branch.name}</h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Active
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
                            <span>{branch.address || branch.city || "Address on request"}</span>
                          </p>
                        </div>

                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8B5CF6]/20 to-[#EC4899]/20 border border-white/10 flex items-center justify-center text-[#A78BFA] shrink-0">
                          <Scissors className="w-5 h-5 -rotate-45" />
                        </div>
                      </div>

                      {/* Contact & Meta */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-[var(--text-secondary)] pt-2 border-t border-white/5">
                        {branch.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <span>{branch.phone}</span>
                          </div>
                        )}
                        {branch.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <span className="truncate">{branch.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span>{branch._count.staff} Certified Stylists</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span>
                            Today:{" "}
                            {todaySchedule?.isOpen
                              ? `${todaySchedule.openTime} - ${todaySchedule.closeTime}`
                              : "Closed"}
                          </span>
                        </div>
                      </div>

                      {/* Weekly Operating Hours Accordion/Cards */}
                      <div className="space-y-2 pt-2">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                          Weekly Operating Hours
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          {branch.schedules.map((s: (typeof branch.schedules)[number]) => (
                            <div
                              key={s.dayOfWeek}
                              className={`p-2 rounded-xl border text-center ${
                                s.dayOfWeek === todayDayOfWeek
                                  ? "bg-[#8B5CF6]/15 border-[#8B5CF6]/30 text-white font-bold"
                                  : "bg-white/[0.02] border-white/5 text-[var(--text-secondary)]"
                              }`}
                            >
                              <div className="text-[10px] text-[var(--text-muted)]">
                                {DAYS[s.dayOfWeek].substring(0, 3)}
                              </div>
                              <div className="mt-0.5">
                                {s.isOpen ? (
                                  <span>{s.openTime}-{s.closeTime}</span>
                                ) : (
                                  <span className="text-red-400">Closed</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Featured Services at this branch */}
                      {branch.services.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                            Popular Services
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {branch.services.map((bs: (typeof branch.services)[number]) => (
                              <span
                                key={bs.id}
                                className="px-2.5 py-1 rounded-lg text-[11px] bg-white/[0.04] border border-white/10 text-white/90"
                              >
                                {bs.service.name} • Rs. {(bs.price ?? bs.service.price).toLocaleString()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Booking CTA */}
                    <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                      <span className="text-xs text-[var(--text-muted)]">
                        Slot interval: {branch.bookingInterval} mins
                      </span>

                      <Link
                        href={`/booking?salonId=${salon.id}&branchId=${branch.id}`}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <span>Book at This Branch</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
