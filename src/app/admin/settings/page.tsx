"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Clock,
  Shield,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [salon, setSalon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [bookingInterval, setBookingInterval] = useState(30);
  const [cancellationWindow, setCancellationWindow] = useState(2);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.salon) {
          setSalon(data.salon);
          setName(data.salon.name || "");
          setDescription(data.salon.description || "");
          setPhone(data.salon.phone || "");
          setEmail(data.salon.email || "");
          setAddress(data.salon.address || "");
          setCity(data.salon.city || "");
          const s = data.salon.settings || {};
          setAutoConfirm(s.autoConfirm === true);
          setBookingInterval(s.bookingInterval || 30);
          setCancellationWindow(s.cancellationWindow || 2);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          phone,
          email,
          address,
          city,
          settings: {
            autoConfirm,
            bookingInterval,
            cancellationWindow,
          },
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update settings");
      }
    } catch {
      setError("Network error while updating settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
        <span>Loading salon configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Salon Configuration & Rules
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Manage operational policies, auto-confirmation modes, and contact information.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Settings</span>
        </button>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Salon configuration saved successfully!</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Booking Engine Policies */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#8B5CF6]" />
              Booking Engine Policies
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Control how customer reservations are confirmed and scheduled.
            </p>
          </div>

          <div className="space-y-4">
            {/* Auto confirm mode */}
            <div className="flex items-start justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="space-y-0.5">
                <span className="font-bold text-sm text-white block">
                  Automatic Slot Confirmation
                </span>
                <p className="text-xs text-[var(--text-muted)]">
                  When enabled, valid available slots immediately transition to CONFIRMED.
                  When disabled, new reservations require admin approval.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoConfirm}
                onChange={(e) => setAutoConfirm(e.target.checked)}
                className="mt-1 w-5 h-5 rounded cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Default Booking Interval
                </label>
                <select
                  value={bookingInterval}
                  onChange={(e) => setBookingInterval(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none"
                >
                  <option value={15} className="bg-[#111827]">15 Minutes</option>
                  <option value={30} className="bg-[#111827]">30 Minutes</option>
                  <option value={45} className="bg-[#111827]">45 Minutes</option>
                  <option value={60} className="bg-[#111827]">60 Minutes</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Cancellation Notice (Hours)
                </label>
                <input
                  type="number"
                  value={cancellationWindow}
                  onChange={(e) => setCancellationWindow(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Salon Profile Details */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#EC4899]" />
              Public Salon Profile
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Displayed on public directory and booking receipts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-[var(--text-secondary)] font-medium">Salon Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[var(--text-secondary)] font-medium">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[var(--text-secondary)] font-medium">Contact Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[var(--text-secondary)] font-medium">Public Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[var(--text-secondary)] font-medium">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[var(--text-secondary)] font-medium">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
