"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Calendar as CalendarIcon,
  Sparkles,
  ArrowRight,
  Building2,
} from "lucide-react";

interface SalonBranch {
  id: string;
  name: string;
  city: string | null;
}

interface SalonOption {
  id: string;
  name: string;
  city: string | null;
  branches: SalonBranch[];
}

export function HeroSearchWidget({ salons }: { salons: SalonOption[] }) {
  const router = useRouter();

  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedSalonId, setSelectedSalonId] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Build unique city list
  const citySet = new Set<string>();
  salons.forEach((s) => {
    if (s.city) citySet.add(s.city);
    s.branches?.forEach((b) => {
      if (b.city) citySet.add(b.city);
    });
  });
  const cities = Array.from(citySet).sort();

  // Filter salons by selectedCity
  const filteredSalons = selectedCity
    ? salons.filter(
        (s) =>
          s.city?.toLowerCase() === selectedCity.toLowerCase() ||
          s.branches?.some(
            (b) => b.city?.toLowerCase() === selectedCity.toLowerCase()
          )
      )
    : salons;

  const activeSalon = filteredSalons.find((s) => s.id === selectedSalonId);
  const branches = activeSalon
    ? selectedCity
      ? activeSalon.branches.filter(
          (b) => !b.city || b.city.toLowerCase() === selectedCity.toLowerCase()
        )
      : activeSalon.branches
    : filteredSalons.flatMap((s) => s.branches).filter((b) =>
        selectedCity
          ? b.city?.toLowerCase() === selectedCity.toLowerCase()
          : true
      );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedCity) params.set("city", selectedCity);
    if (selectedSalonId) params.set("salonId", selectedSalonId);
    if (selectedBranchId) params.set("branchId", selectedBranchId);
    if (date) params.set("date", date);
    router.push(`/booking?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-8">
      <form
        onSubmit={handleSearch}
        className="p-3 sm:p-4 rounded-3xl bg-[#111322]/90 border border-white/[0.12] shadow-2xl shadow-black/80 backdrop-blur-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center"
      >
        {/* City / District Filter */}
        <div className="flex flex-col px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:border-violet-500/40 transition-colors">
          <label className="text-[10px] font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1.5 mb-1">
            <MapPin className="w-3 h-3 text-violet-400" />
            <span>Area / District</span>
          </label>
          <select
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              setSelectedSalonId("");
              setSelectedBranchId("");
            }}
            className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer truncate"
          >
            <option value="" className="bg-[#111322] text-white">
              Any Area
            </option>
            {cities.map((c) => (
              <option key={c} value={c} className="bg-[#111322] text-white">
                📍 {c}
              </option>
            ))}
          </select>
        </div>

        {/* Salon Selector */}
        <div className="flex flex-col px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:border-white/20 transition-colors">
          <label className="text-[10px] font-bold uppercase tracking-wider text-pink-300 flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3 h-3 text-pink-400" />
            <span>Salon / Studio</span>
          </label>
          <select
            value={selectedSalonId}
            onChange={(e) => {
              setSelectedSalonId(e.target.value);
              setSelectedBranchId("");
            }}
            className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer truncate"
          >
            <option value="" className="bg-[#111322] text-white">
              All Salons
            </option>
            {filteredSalons.map((salon) => (
              <option key={salon.id} value={salon.id} className="bg-[#111322] text-white">
                {salon.name}
                {salon.city ? ` (${salon.city})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Branch / Location Selector */}
        <div className="flex flex-col px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:border-white/20 transition-colors">
          <label className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 mb-1">
            <Building2 className="w-3 h-3 text-cyan-400" />
            <span>Branch</span>
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer truncate"
          >
            <option value="" className="bg-[#111322] text-white">
              Any Branch
            </option>
            {branches.map((b) => (
              <option key={b.id} value={b.id} className="bg-[#111322] text-white">
                {b.name}
                {b.city ? ` (${b.city})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Date Selector */}
        <div className="flex flex-col px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:border-white/20 transition-colors">
          <label className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5 mb-1">
            <CalendarIcon className="w-3 h-3 text-amber-400" />
            <span>Date</span>
          </label>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
          />
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          className="h-[58px] px-6 rounded-2xl font-heading font-bold text-sm bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-violet-600/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
        >
          <Search className="w-4 h-4" />
          <span>Find Slots</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </form>

      {/* Quick city chips below the widget */}
      {cities.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 justify-center">
          <span className="text-[11px] text-zinc-500 font-semibold">
            Quick:
          </span>
          {cities.slice(0, 6).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setSelectedCity(c);
                setSelectedSalonId("");
                setSelectedBranchId("");
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                selectedCity === c
                  ? "bg-violet-600 border-violet-600 text-white"
                  : "bg-white/[0.04] border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              📍 {c}
            </button>
          ))}
          {selectedCity && (
            <button
              type="button"
              onClick={() => {
                setSelectedCity("");
                setSelectedSalonId("");
                setSelectedBranchId("");
              }}
              className="px-3 py-1 rounded-full text-[11px] font-bold border border-white/10 text-zinc-500 hover:text-white hover:border-white/20 transition-all"
            >
              ✕ Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
