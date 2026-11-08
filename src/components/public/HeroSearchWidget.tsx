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

  const citySet = new Set<string>();
  salons.forEach((s) => {
    if (s.city) citySet.add(s.city);
    s.branches?.forEach((b) => {
      if (b.city) citySet.add(b.city);
    });
  });
  const cities = Array.from(citySet).sort();

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
        className="p-3 sm:p-4 rounded-3xl bg-white/95 border border-white shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center"
      >
        {/* City / District Filter */}
        <div className="flex flex-col px-3 py-2 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#7C3AED]/40 transition-colors">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#6D28D9] flex items-center gap-1.5 mb-1">
            <MapPin className="w-3 h-3 text-[#7C3AED]" />
            <span>Area / District</span>
          </label>
          <select
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              setSelectedSalonId("");
              setSelectedBranchId("");
            }}
            className="bg-transparent text-sm font-bold text-[#0F172A] focus:outline-none cursor-pointer truncate"
          >
            <option value="" className="bg-white text-[#0F172A]">
              Any Area
            </option>
            {cities.map((c) => (
              <option key={c} value={c} className="bg-white text-[#0F172A]">
                📍 {c}
              </option>
            ))}
          </select>
        </div>

        {/* Salon Selector */}
        <div className="flex flex-col px-3 py-2 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#7C3AED]/40 transition-colors">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#DB2777] flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3 h-3 text-[#EC4899]" />
            <span>Salon / Studio</span>
          </label>
          <select
            value={selectedSalonId}
            onChange={(e) => {
              setSelectedSalonId(e.target.value);
              setSelectedBranchId("");
            }}
            className="bg-transparent text-sm font-bold text-[#0F172A] focus:outline-none cursor-pointer truncate"
          >
            <option value="" className="bg-white text-[#0F172A]">
              All Salons
            </option>
            {filteredSalons.map((salon) => (
              <option key={salon.id} value={salon.id} className="bg-white text-[#0F172A]">
                {salon.name}
                {salon.city ? ` (${salon.city})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Branch / Location Selector */}
        <div className="flex flex-col px-3 py-2 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#7C3AED]/40 transition-colors">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#0284C7] flex items-center gap-1.5 mb-1">
            <Building2 className="w-3 h-3 text-[#0EA5E9]" />
            <span>Branch</span>
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-transparent text-sm font-bold text-[#0F172A] focus:outline-none cursor-pointer truncate"
          >
            <option value="" className="bg-white text-[#0F172A]">
              Any Branch
            </option>
            {branches.map((b) => (
              <option key={b.id} value={b.id} className="bg-white text-[#0F172A]">
                {b.name}
                {b.city ? ` (${b.city})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Date Selector */}
        <div className="flex flex-col px-3 py-2 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#7C3AED]/40 transition-colors">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#D97706] flex items-center gap-1.5 mb-1">
            <CalendarIcon className="w-3 h-3 text-[#F59E0B]" />
            <span>Date</span>
          </label>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-sm font-bold text-[#0F172A] focus:outline-none cursor-pointer"
          />
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          className="h-[58px] px-6 rounded-2xl font-heading font-bold text-sm bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-[0_8px_20px_rgba(124,58,237,0.3)] hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
        >
          <Search className="w-4 h-4" />
          <span>Find Slots</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </form>

      {cities.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 justify-center">
          <span className="text-[11px] text-[#64748B] font-bold">
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
                  ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                  : "bg-white/90 border-white text-[#475569] hover:border-[#DDD6FE] hover:text-[#6D28D9] shadow-xs"
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
              className="px-3 py-1 rounded-full text-[11px] font-bold border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A] transition-all"
            >
              ✕ Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
