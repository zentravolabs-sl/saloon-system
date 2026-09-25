"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Globe,
  Bell,
  Database,
  DollarSign,
  Lock,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function SuperAdminSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    platformName: "Zentravo Salon SaaS",
    platformEmail: "admin@zentravo.com",
    supportEmail: "support@zentravo.com",
    defaultCurrency: "LKR",
    defaultTimezone: "Asia/Colombo",
    defaultCountry: "Sri Lanka",
    maxSalonsPerOwner: 3,
    trialDays: 14,
    requireApproval: true,
    emailNotifications: true,
    smsNotifications: false,
    maintenanceMode: false,
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const Section = ({ title, icon: Icon, children }: any) => (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-white/5">
        <div className="p-2 rounded-xl bg-amber-500/10">
          <Icon className="w-4 h-4 text-amber-400" />
        </div>
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );

  const Field = ({ label, children }: any) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
      <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider pt-2.5">{label}</label>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );

  const Input = ({ value, onChange, type = "text", ...props }: any) => (
    <input
      type={type}
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-amber-400/50 transition-colors"
      {...props}
    />
  );

  const Toggle = ({ checked, onChange, label }: any) => (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <div className={`w-11 h-6 rounded-full transition-colors ${checked ? "bg-amber-500" : "bg-white/10"}`} />
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? "translate-x-5" : ""}`} />
      </div>
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
    </label>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Configure global platform settings and defaults</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>

      {/* General */}
      <Section title="General Platform Settings" icon={Globe}>
        <Field label="Platform Name">
          <Input value={settings.platformName} onChange={(e: any) => setSettings((s) => ({ ...s, platformName: e.target.value }))} />
        </Field>
        <Field label="Admin Email">
          <Input type="email" value={settings.platformEmail} onChange={(e: any) => setSettings((s) => ({ ...s, platformEmail: e.target.value }))} />
        </Field>
        <Field label="Support Email">
          <Input type="email" value={settings.supportEmail} onChange={(e: any) => setSettings((s) => ({ ...s, supportEmail: e.target.value }))} />
        </Field>
      </Section>

      {/* Regional */}
      <Section title="Regional Defaults" icon={DollarSign}>
        <Field label="Default Currency">
          <select
            value={settings.defaultCurrency}
            onChange={(e) => setSettings((s) => ({ ...s, defaultCurrency: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400/50"
          >
            {["LKR", "USD", "GBP", "EUR", "AUD", "INR", "SGD"].map((c) => (
              <option key={c} value={c} className="bg-[#0C0E1A]">{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Default Timezone">
          <select
            value={settings.defaultTimezone}
            onChange={(e) => setSettings((s) => ({ ...s, defaultTimezone: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400/50"
          >
            {["Asia/Colombo", "UTC", "America/New_York", "Europe/London", "Asia/Singapore", "Australia/Sydney"].map((tz) => (
              <option key={tz} value={tz} className="bg-[#0C0E1A]">{tz}</option>
            ))}
          </select>
        </Field>
        <Field label="Default Country">
          <Input value={settings.defaultCountry} onChange={(e: any) => setSettings((s) => ({ ...s, defaultCountry: e.target.value }))} />
        </Field>
      </Section>

      {/* Registration */}
      <Section title="Salon Registration" icon={ShieldCheck}>
        <Field label="Max Salons per Owner">
          <Input
            type="number"
            min={1}
            max={10}
            value={settings.maxSalonsPerOwner}
            onChange={(e: any) => setSettings((s) => ({ ...s, maxSalonsPerOwner: Number(e.target.value) }))}
          />
        </Field>
        <Field label="Trial Period (days)">
          <Input
            type="number"
            min={0}
            max={90}
            value={settings.trialDays}
            onChange={(e: any) => setSettings((s) => ({ ...s, trialDays: Number(e.target.value) }))}
          />
        </Field>
        <Field label="Approval Required">
          <Toggle
            checked={settings.requireApproval}
            onChange={(e: any) => setSettings((s) => ({ ...s, requireApproval: e.target.checked }))}
            label="New salons require manual approval before activation"
          />
        </Field>
      </Section>

      {/* Notifications */}
      <Section title="Platform Notifications" icon={Bell}>
        <Field label="Email Notifications">
          <Toggle
            checked={settings.emailNotifications}
            onChange={(e: any) => setSettings((s) => ({ ...s, emailNotifications: e.target.checked }))}
            label="Send email notifications for new registrations"
          />
        </Field>
        <Field label="SMS Notifications">
          <Toggle
            checked={settings.smsNotifications}
            onChange={(e: any) => setSettings((s) => ({ ...s, smsNotifications: e.target.checked }))}
            label="Send SMS notifications (requires SMS provider)"
          />
        </Field>
      </Section>

      {/* System */}
      <Section title="System" icon={Database}>
        <Field label="Maintenance Mode">
          <Toggle
            checked={settings.maintenanceMode}
            onChange={(e: any) => setSettings((s) => ({ ...s, maintenanceMode: e.target.checked }))}
            label="Enable maintenance mode (disables public access)"
          />
        </Field>
        {settings.maintenanceMode && (
          <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20">
            <p className="text-sm text-red-400 font-semibold">⚠️ Maintenance mode is ON. Public users cannot access the platform.</p>
          </div>
        )}
      </Section>
    </div>
  );
}
