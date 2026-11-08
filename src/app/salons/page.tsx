import Link from "next/link";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import { prisma } from "@/lib/prisma";
import {
  Scissors,
  Star,
  MapPin,
  Calendar,
  Building2,
  Users,
  Search,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SalonsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; city?: string }>;
}) {
  const { search, city } = await searchParams;

  const where: any = {
    status: "APPROVED",
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];
  }

  if (city) {
    where.OR = [
      ...(where.OR || []),
      { city: { contains: city, mode: "insensitive" } },
      {
        branches: {
          some: {
            city: { contains: city, mode: "insensitive" },
            status: "ACTIVE",
          },
        },
      },
    ];
  }

  const salons = await prisma.salon.findMany({
    where,
    include: {
      branches: {
        where: { status: "ACTIVE" },
        select: { id: true, name: true, city: true, address: true, phone: true },
      },
      services: {
        where: { isActive: true },
        select: { id: true, name: true, price: true, duration: true },
        take: 6,
      },
      _count: { select: { staff: true, bookings: true, branches: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Build distinct city list from ALL approved salons / branches for filter chips
  const allSalonCities = await prisma.salon.findMany({
    where: { status: "APPROVED", city: { not: null } },
    select: { city: true },
    distinct: ["city"],
  });
  const allBranchCities = await prisma.branch.findMany({
    where: { status: "ACTIVE", city: { not: null }, salon: { status: "APPROVED" } },
    select: { city: true },
    distinct: ["city"],
  });
  const citySet = new Set<string>();
  allSalonCities.forEach((s: { city: string | null }) => s.city && citySet.add(s.city));
  allBranchCities.forEach((b: { city: string | null }) => b.city && citySet.add(b.city));
  const cities = Array.from(citySet).sort();

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[#0F172A] selection:bg-violet-500/30">
      <PublicNavbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        {/* Header */}
        <div className="space-y-5 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 text-[#6D28D9] text-xs font-bold uppercase tracking-wider border border-violet-500/20">
            <Building2 className="w-3.5 h-3.5" />
            <span>Salon Directory</span>
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl font-black text-[#0F172A] tracking-tight">
            Find &amp; Book Premier Salons
          </h1>

          <p className="text-[#64748B] text-sm sm:text-base max-w-2xl leading-relaxed">
            Discover verified salons, view working schedules, browse service
            menus with pricing, and select your favorite stylists.
          </p>

          {/* Search bar */}
          <form
            method="GET"
            action="/salons"
            className="pt-2 flex flex-col sm:flex-row gap-3 max-w-2xl"
          >
            {/* Preserve city filter when searching */}
            {city && (
              <input type="hidden" name="city" value={city} />
            )}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                name="search"
                defaultValue={search || ""}
                placeholder="Search salons by name, service, or city..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-violet-500 transition-colors shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl font-heading font-bold text-sm bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg shadow-violet-600/25 hover:brightness-110 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              Search Salons
            </button>
          </form>

          {/* ─── City / District filter chips ───────────────────── */}
          {cities.length > 0 && (
            <div className="pt-2">
              <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#DB2777]" />
                Filter by Area / District
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={search ? `/salons?search=${encodeURIComponent(search)}` : "/salons"}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    !city
                      ? "bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-600/30"
                      : "bg-[#F8FAFC] border-[#E2E8F0] text-[#334155] hover:border-[#E2E8F0] hover:text-[#6D28D9]"
                  }`}
                >
                  🌍 All Areas
                </Link>
                {cities.map((c) => (
                  <Link
                    key={c}
                    href={
                      search
                        ? `/salons?city=${encodeURIComponent(c)}&search=${encodeURIComponent(search)}`
                        : `/salons?city=${encodeURIComponent(c)}`
                    }
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      city?.toLowerCase() === c.toLowerCase()
                        ? "bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-600/30"
                        : "bg-[#F8FAFC] border-[#E2E8F0] text-[#334155] hover:border-[#E2E8F0] hover:text-[#6D28D9]"
                    }`}
                  >
                    <MapPin className="w-3 h-3" />
                    {c}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Active filters summary */}
          {(city || search) && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs text-[#64748B]">
                {salons.length} salon{salons.length !== 1 ? "s" : ""} found
                {city ? ` in ${city}` : ""}
                {search ? ` for "${search}"` : ""}
              </span>
              <Link
                href="/salons"
                className="text-xs text-[#6D28D9] hover:text-[#6D28D9] underline underline-offset-2"
              >
                Clear filters
              </Link>
            </div>
          )}
        </div>

        {/* Salons Grid */}
        {salons.length === 0 ? (
          <div className="py-24 text-center rounded-3xl bg-white/95 border border-[#E2E8F0] p-8 space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mx-auto text-[#64748B]">
              <Building2 className="w-7 h-7" />
            </div>
            <h3 className="font-heading text-xl font-bold text-[#0F172A]">
              No Salons Found
            </h3>
            <p className="text-sm text-[#64748B]">
              No matching salons found{city ? ` in ${city}` : ""}.{" "}
              {city && "Try a different area or "}
              view all partners.
            </p>
            <div className="pt-2">
              <Link
                href="/salons"
                className="inline-block px-5 py-2.5 rounded-xl text-xs font-bold bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] transition-colors"
              >
                Clear Filters
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {salons.map((salon: (typeof salons)[number]) => {
              const avgRating = "4.9";

              return (
                <div
                  key={salon.id}
                  className="rounded-3xl bg-white border border-[#E2E8F0] hover:border-violet-500/40 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-600/10 group"
                >
                  <div className="space-y-5">
                    {/* Header */}
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
                          {salon.city && (
                            <span className="text-xs text-[#64748B] flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#DB2777]" />
                              {salon.city}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[#D97706] text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-[#D97706]" />
                        <span>{avgRating}</span>
                      </div>
                    </div>

                    {salon.description && (
                      <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                        {salon.description}
                      </p>
                    )}

                    {/* Stats pills */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] flex items-center gap-2 text-[#334155]">
                        <Building2 className="w-3.5 h-3.5 text-[#0284C7]" />
                        <span>{salon.branches.length} Branches</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] flex items-center gap-2 text-[#334155]">
                        <Users className="w-3.5 h-3.5 text-[#DB2777]" />
                        <span>{salon._count.staff} Stylists</span>
                      </div>
                    </div>

                    {/* Branches preview */}
                    <div className="space-y-1.5 pt-2 border-t border-[#E2E8F0]">
                      <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                        Locations
                      </p>
                      <div className="space-y-1">
                        {salon.branches.slice(0, 3).map((b: any) => (
                          <div
                            key={b.id}
                            className="flex items-center gap-1.5 text-xs text-[#334155]"
                          >
                            <MapPin className="w-3.5 h-3.5 text-[#DB2777] shrink-0" />
                            <span className="font-medium text-[#334155]">
                              {b.name}
                            </span>
                            {b.city && (
                              <span
                                className={`text-[11px] truncate px-1.5 py-0.5 rounded-md ${
                                  city &&
                                  b.city.toLowerCase() === city.toLowerCase()
                                    ? "bg-violet-500/20 text-[#6D28D9] border border-violet-500/30"
                                    : "text-[#64748B]"
                                }`}
                              >
                                {b.city}
                              </span>
                            )}
                          </div>
                        ))}
                        {salon.branches.length > 3 && (
                          <p className="text-[11px] text-[#64748B]">
                            +{salon.branches.length - 3} more branch
                            {salon.branches.length - 3 !== 1 ? "es" : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Services sample */}
                    <div className="pt-2 border-t border-[#E2E8F0]">
                      <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        Featured Services
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {salon.services.map((srv: any) => (
                          <span
                            key={srv.id}
                            className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] text-[11px] text-[#334155] font-medium border border-[#E2E8F0]"
                          >
                            {srv.name} · LKR {srv.price.toLocaleString()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-6 mt-6 border-t border-[#E2E8F0] flex items-center gap-3">
                    <Link
                      href={`/salons/${salon.slug}`}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-center bg-[#F8FAFC] hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] hover:border-[#E2E8F0] transition-all"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/booking?salonId=${salon.id}${city ? `&city=${encodeURIComponent(city)}` : ""}`}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-center bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-md shadow-violet-600/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book Now</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
