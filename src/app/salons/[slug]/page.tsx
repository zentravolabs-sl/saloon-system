import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import { prisma } from "@/lib/prisma";
import {
  Scissors,
  Star,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Mail,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Shield,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SalonDetailPage({
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
        },
      },
      serviceCategories: {
        where: { isActive: true },
        include: {
          services: {
            where: { isActive: true },
            include: {
              staffServices: { include: { staff: { select: { id: true, name: true } } } },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      staff: {
        where: { status: "ACTIVE" },
        include: {
          branches: { include: { branch: { select: { name: true } } } },
          services: { include: { service: { select: { name: true } } } },
        },
      },
    },
  });

  if (!salon || salon.status !== "APPROVED") {
    notFound();
  }

  const reviews = await prisma.review.findMany({
    where: { salonId: salon.id, isPublished: true },
    include: {
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum: number, r: (typeof reviews)[number]) => sum + r.salonRating, 0) /
          reviews.length
        ).toFixed(1)
      : "5.0";

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0B14] text-white">
      <PublicNavbar />

      {/* Hero Header */}
      <section className="relative overflow-hidden pt-12 pb-16 border-b border-[var(--border)] bg-[#0C0E1A]">
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-[#8B5CF6]/15 blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-[#8B5CF6]/30">
                  {salon.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {salon.name}
                    </h1>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                      Verified
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mt-1">
                    <span className="flex items-center gap-1 text-amber-300 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {avgRating} ({reviews.length} reviews)
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#EC4899]" />
                      {salon.city}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {salon.description}
              </p>

              <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)] pt-2">
                {salon.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{salon.phone}</span>
                  </div>
                )}
                {salon.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{salon.email}</span>
                  </div>
                )}
                {salon.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{salon.address}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 flex flex-col gap-3">
              <Link
                href={`/booking?salonId=${salon.id}`}
                className="px-8 py-4 rounded-xl font-bold text-base bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-xl shadow-[#8B5CF6]/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                <span>Book Appointment</span>
              </Link>
              <p className="text-center text-[11px] text-[var(--text-muted)]">
                Instant confirmation • No double bookings
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-16">
        {/* Branches & Schedules Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#8B5CF6]" />
            <h2 className="text-2xl font-black text-white">Our Branches & Operating Hours</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salon.branches.map((branch: (typeof salon.branches)[number]) => (
              <div
                key={branch.id}
                className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 space-y-4 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white">{branch.name}</h3>
                    <p className="text-xs text-[var(--text-muted)]">{branch.address}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                    Active
                  </span>
                </div>

                <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Weekly Hours
                  </p>
                  <div className="text-xs space-y-1">
                    {branch.schedules.map((sch: (typeof branch.schedules)[number]) => (
                      <div
                        key={sch.id}
                        className="flex items-center justify-between text-[var(--text-secondary)]"
                      >
                        <span className="w-24 text-[var(--text-muted)]">
                          {daysOfWeek[sch.dayOfWeek]}
                        </span>
                        {sch.isOpen ? (
                          <span className="font-medium text-white">
                            {sch.openTime} – {sch.closeTime}
                          </span>
                        ) : (
                          <span className="text-red-400 font-medium">Closed</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06]">
                  <Link
                    href={`/booking?salonId=${salon.id}&branchId=${branch.id}`}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-center bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Book at {branch.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Service Menu */}
        <section className="space-y-8">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-[#EC4899]" />
            <h2 className="text-2xl font-black text-white">Services & Pricing Menu</h2>
          </div>

          <div className="space-y-8">
            {salon.serviceCategories.map((category: (typeof salon.serviceCategories)[number]) => (
              <div key={category.id} className="space-y-4">
                <h3 className="text-xl font-bold text-white border-b border-white/10 pb-2">
                  {category.name}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.services.map((service: (typeof category.services)[number]) => (
                    <div
                      key={service.id}
                      className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition-colors flex items-center justify-between gap-4 group"
                    >
                      <div className="space-y-1">
                        <h4 className="font-bold text-white group-hover:text-[#A78BFA] transition-colors">
                          {service.name}
                        </h4>
                        {service.description && (
                          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                            {service.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#06B6D4]" />
                            {service.duration} mins
                          </span>
                          {service.bufferTime > 0 && (
                            <span className="text-[11px] text-[var(--text-muted)]">
                              (+{service.bufferTime}m buffer)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-2">
                        <p className="text-base font-black text-white">
                          LKR {service.price.toLocaleString()}
                        </p>
                        <Link
                          href={`/booking?salonId=${salon.id}&serviceId=${service.id}`}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white hover:brightness-110 active:scale-95 transition-all inline-block"
                        >
                          Book Service
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Staff & Stylists */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#06B6D4]" />
            <h2 className="text-2xl font-black text-white">Stylists & Specialists</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {salon.staff.map((member: (typeof salon.staff)[number]) => (
              <div
                key={member.id}
                className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-5 space-y-3 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#06B6D4] mx-auto flex items-center justify-center text-white font-black text-xl shadow-lg">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">{member.name}</h4>
                  <p className="text-xs text-[#A78BFA] font-medium">{member.specialization || "Senior Stylist"}</p>
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  {member.branches.map((b: (typeof member.branches)[number]) => b.branch.name).join(", ")}
                </div>
                <Link
                  href={`/booking?salonId=${salon.id}&staffId=${member.id}`}
                  className="w-full py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors inline-block"
                >
                  Book with {member.name.split(" ")[0]}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <section className="space-y-6 border-t border-[var(--border)] pt-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400" />
                <h2 className="text-2xl font-black text-white">Customer Reviews</h2>
              </div>
              <span className="text-sm text-[var(--text-muted)]">
                Average {avgRating} out of 5 stars
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((rev: (typeof reviews)[number]) => (
                <div
                  key={rev.id}
                  className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">
                      {rev.customer?.name || "Customer"}
                    </span>
                    <div className="flex items-center gap-1 text-amber-400">
                      {Array.from({ length: rev.salonRating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  {rev.comment && (
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                      "{rev.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
