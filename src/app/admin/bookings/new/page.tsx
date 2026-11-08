"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Loader2, Search, UserPlus, X } from "lucide-react";
import { useT } from "@/context/I18nContext";
import { useSalonStatus } from "@/context/SalonStatusContext";
import {
  Banner, EmptyState, Panel, btnPrimary, btnSecondary, formatMoney, inputClass, labelClass,
} from "@/components/admin/ui";

interface Customer { id?: string; name: string; phone: string; totalBookings?: number }
interface Service { id: string; name: string; price: number; duration: number; assignedStaff: { id: string; name: string; status?: string }[] }
interface Staff { id: string; name: string; status: string; specialization?: string | null }
interface Slot { startTime: string; endTime: string; available: boolean }

const ANY = "ANY";

function isoDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function NewBookingPage() {
  const { t } = useT();
  const { isApproved } = useSalonStatus();

  // Step state
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchId, setBranchId] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [staffChoice, setStaffChoice] = useState<string>(ANY);
  const [date, setDate] = useState(isoDay(0));
  const [slots, setSlots] = useState<{ time: string; staffId: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ customer: string; date: string; time: string; staff: string } | null>(null);

  const serviceRef = useRef<HTMLDivElement>(null);

  /* ----------------------------- data loading ----------------------------- */
  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => {
        const list = d.branches || [];
        setBranches(list);
        if (list.length) setBranchId(list[0].id); // sensible default: first branch
      })
      .catch(() => setError(t("common.errorGeneric")));
  }, [t]);

  useEffect(() => {
    if (!branchId) return;
    setServiceIds([]);
    setStaffChoice(ANY);
    setTime("");
    Promise.all([
      fetch(`/api/services?branchId=${branchId}`).then((r) => r.json()),
      fetch(`/api/staff?branchId=${branchId}`).then((r) => r.json()),
    ])
      .then(([s, st]) => {
        setServices(s.services || []);
        setStaffList((st.staff || []).filter((x: Staff) => x.status === "ACTIVE"));
      })
      .catch(() => setError(t("common.errorGeneric")));
  }, [branchId, t]);

  // Debounced customer search by name or phone
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const id = setTimeout(() => {
      fetch(`/api/customers?search=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setResults((d.customers || []).slice(0, 6)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  /* --------------------------- derived selections -------------------------- */
  const chosen = useMemo(() => services.filter((s) => serviceIds.includes(s.id)), [services, serviceIds]);
  const total = chosen.reduce((a, s) => a + s.price, 0);
  const minutes = chosen.reduce((a, s) => a + s.duration, 0);

  // Staff who can perform every selected service (services with no assignment list are open to all)
  const eligibleStaff = useMemo(() => {
    return staffList.filter((st) =>
      chosen.every((s) => s.assignedStaff.length === 0 || s.assignedStaff.some((a) => a.id === st.id))
    );
  }, [staffList, chosen]);

  useEffect(() => {
    if (staffChoice !== ANY && !eligibleStaff.some((s) => s.id === staffChoice)) setStaffChoice(ANY);
  }, [eligibleStaff, staffChoice]);

  // Load free times (for one staff member, or merged across everyone eligible for "any")
  const loadSlots = useCallback(async () => {
    if (!branchId || chosen.length === 0 || !date) return;
    const candidates = staffChoice === ANY ? eligibleStaff : eligibleStaff.filter((s) => s.id === staffChoice);
    if (candidates.length === 0) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    setSlotsError("");
    try {
      const merged = new Map<string, string>();
      let firstError = "";
      await Promise.all(
        candidates.map(async (st) => {
          const res = await fetch(
            `/api/availability?branchId=${branchId}&staffId=${st.id}&serviceIds=${serviceIds.join(",")}&date=${date}`
          );
          const j: { slots?: Slot[]; error?: string } = await res.json();
          if (j.error && !firstError) firstError = j.error;
          (j.slots || []).forEach((s) => {
            if (s.available && !merged.has(s.startTime)) merged.set(s.startTime, st.id);
          });
        })
      );
      const list = Array.from(merged.entries())
        .map(([time, staffId]) => ({ time, staffId }))
        .sort((a, b) => a.time.localeCompare(b.time));
      setSlots(list);
      if (list.length === 0 && firstError) setSlotsError(firstError);
      setTime((cur) => (list.some((s) => s.time === cur) ? cur : ""));
    } catch {
      setSlots([]);
      setSlotsError(t("common.errorGeneric"));
    } finally {
      setSlotsLoading(false);
    }
  }, [branchId, chosen.length, date, staffChoice, eligibleStaff, serviceIds, t]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  /* -------------------------------- actions -------------------------------- */
  const toggleService = (id: string) =>
    setServiceIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const pickCustomer = (c: Customer) => {
    setCustomer({ id: c.id, name: c.name, phone: c.phone });
    setShowNew(false);
    setQuery("");
    setResults([]);
    setTimeout(() => serviceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const useNewCustomer = () => {
    if (newName.trim().length < 2 || newPhone.trim().length < 7) {
      setError(t("book.needNameAndPhone"));
      return;
    }
    setError("");
    pickCustomer({ name: newName.trim(), phone: newPhone.trim() });
  };

  const slot = slots.find((s) => s.time === time);
  const staffName = staffList.find((s) => s.id === slot?.staffId)?.name || "";
  const ready = !!customer && chosen.length > 0 && !!slot && isApproved;

  const submit = async () => {
    if (!ready || !customer || !slot) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          staffId: slot.staffId,
          serviceIds,
          bookingDate: date,
          startTime: slot.time,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerNotes: notes.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || t("common.errorGeneric"));
        loadSlots(); // the time may have just been taken
      } else {
        setCreated({ customer: customer.name, date, time: slot.time, staff: staffName });
      }
    } catch {
      setError(t("common.errorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setCustomer(null);
    setServiceIds([]);
    setStaffChoice(ANY);
    setDate(isoDay(0));
    setTime("");
    setNotes("");
    setNewName("");
    setNewPhone("");
    setShowNew(false);
    setCreated(null);
    setError("");
  };

  /* ---------------------------------- UI ---------------------------------- */
  if (created) {
    return (
      <div className="max-w-xl mx-auto">
        <Panel>
          <div className="text-center space-y-4 py-4">
            <CheckCircle2 className="w-16 h-16 text-[#15803D] mx-auto" aria-hidden />
            <h1 className="text-2xl font-extrabold text-[#0F172A]" role="status">{t("book.created")}</h1>
            <p className="text-lg text-[#0F172A]">
              {t("book.createdFor", { customer: created.customer, date: created.date, time: created.time })}
            </p>
            {created.staff && <p className="text-base text-[#334155]">{created.staff}</p>}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button className={btnPrimary} onClick={reset}>{t("book.another")}</button>
              <Link href="/admin/bookings" className={btnSecondary}>{t("book.viewAppointments")}</Link>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  const steps = [
    { label: t("book.step.customer"), done: !!customer },
    { label: t("book.step.service"), done: chosen.length > 0 },
    { label: t("book.step.staff"), done: chosen.length > 0 },
    { label: t("book.step.time"), done: !!slot },
    { label: t("book.step.confirm"), done: false },
  ];
  const current = !customer ? 0 : chosen.length === 0 ? 1 : !slot ? 3 : 4;

  return (
    <div className="w-full space-y-5">
      <h1 className="sr-only">{t("book.title")}</h1>

      <ol className="flex items-center gap-1 sm:gap-2" aria-label={t("book.title")}>
        {steps.map((s, i) => (
          <li key={s.label} className="flex-1 min-w-0" aria-current={i === current ? "step" : undefined}>
            <div className={`h-2 rounded-full ${s.done || i < current ? "bg-[#8B5CF6]" : i === current ? "bg-[#8B5CF6]/60" : "bg-[#F8FAFC]"}`} />
            <p className={`mt-1.5 text-xs sm:text-sm truncate ${i === current ? "text-[#0F172A] font-bold" : "text-[#64748B]"}`}>
              {i + 1}. {s.label}
            </p>
          </li>
        ))}
      </ol>

      {!isApproved && <Banner kind="info">{t("common.pendingApproval")}</Banner>}
      {error && <Banner kind="error" onClose={() => setError("")}>{error}</Banner>}

      {/* 1. Customer */}
      <Panel title={`1. ${t("book.step.customer")}`}>
        {customer ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
            <div>
              <p className="text-lg font-bold text-[#0F172A]">{customer.name}</p>
              <p className="text-base text-[#334155]">{customer.phone}</p>
            </div>
            <button className={btnSecondary} onClick={() => setCustomer(null)}>
              <X className="w-4 h-4" aria-hidden /> {t("book.change")}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="cust-search" className={labelClass}>{t("book.searchCustomer")}</label>
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" aria-hidden />
                <input
                  id="cust-search"
                  type="search"
                  inputMode="search"
                  autoComplete="off"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={`${inputClass} pl-12`}
                  placeholder="07X XXX XXXX"
                />
                {searching && <Loader2 className="w-5 h-5 animate-spin absolute right-4 top-1/2 -translate-y-1/2 text-[#6D28D9]" aria-hidden />}
              </div>
            </div>

            {results.length > 0 && (
              <ul className="space-y-2" aria-label={t("book.step.customer")}>
                {results.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => pickCustomer(c)}
                      className="w-full text-left rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#A78BFA] px-4 min-h-14 py-2 flex items-center justify-between gap-3"
                    >
                      <span>
                        <span className="block text-base font-bold text-[#0F172A]">{c.name}</span>
                        <span className="block text-sm text-[#334155]">{c.phone}</span>
                      </span>
                      <span className="text-sm text-[#6D28D9] font-semibold">{t("book.useThisCustomer")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {query.trim().length >= 2 && !searching && results.length === 0 && !showNew && (
              <p className="text-base text-[#334155]">{t("book.noCustomerFound")}</p>
            )}

            {!showNew ? (
              <button
                className={btnSecondary}
                onClick={() => {
                  setShowNew(true);
                  const q = query.trim();
                  if (/^[+\d\s-]{5,}$/.test(q)) setNewPhone(q);
                  else if (q) setNewName(q);
                }}
              >
                <UserPlus className="w-5 h-5" aria-hidden /> {t("book.registerNew")}
              </button>
            ) : (
              <div className="rounded-xl border border-[#E2E8F0] p-4 space-y-3">
                <p className="font-bold text-[#0F172A]">{t("book.newCustomer")}</p>
                <div>
                  <label htmlFor="nc-name" className={labelClass}>{t("book.customerName")}</label>
                  <input id="nc-name" className={inputClass} value={newName} onChange={(e) => setNewName(e.target.value)} autoComplete="off" />
                </div>
                <div>
                  <label htmlFor="nc-phone" className={labelClass}>{t("book.customerPhone")}</label>
                  <input id="nc-phone" className={inputClass} type="tel" inputMode="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} autoComplete="off" />
                </div>
                <div className="flex gap-3">
                  <button className={btnPrimary} onClick={useNewCustomer}>{t("common.next")}</button>
                  <button className={btnSecondary} onClick={() => setShowNew(false)}>{t("common.cancel")}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>

      {/* 2. Service */}
      {customer && (
        <div ref={serviceRef}>
          <Panel title={`2. ${t("book.chooseService")}`}>
            {branches.length > 1 && (
              <div className="mb-4">
                <label htmlFor="branch" className={labelClass}>{t("book.branch")}</label>
                <select id="branch" className={inputClass} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            {services.length === 0 ? (
              <EmptyState text={t("book.noServices")} />
            ) : (
              <ul className="grid sm:grid-cols-2 gap-3">
                {services.map((s) => {
                  const on = serviceIds.includes(s.id);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => toggleService(s.id)}
                        className={`w-full text-left rounded-xl border px-4 min-h-16 py-3 flex items-center justify-between gap-3 transition-colors ${
                          on ? "bg-[#8B5CF6]/20 border-[#A78BFA]" : "bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1]"
                        }`}
                      >
                        <span>
                          <span className="block text-base font-bold text-[#0F172A]">{s.name}</span>
                          <span className="block text-sm text-[#334155]">{t("book.duration", { n: s.duration })} · {formatMoney(s.price)}</span>
                        </span>
                        <span className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${on ? "bg-[#8B5CF6] border-[#8B5CF6]" : "border-[#E2E8F0]"}`}>
                          {on && <Check className="w-5 h-5 text-white" aria-hidden />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {/* 3. Staff */}
      {customer && chosen.length > 0 && (
        <Panel title={`3. ${t("book.chooseStaff")}`}>
          {eligibleStaff.length === 0 ? (
            <EmptyState text={t("book.noStaff")} />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3" role="radiogroup" aria-label={t("book.chooseStaff")}>
              {[{ id: ANY, name: t("book.anyStaff") }, ...eligibleStaff].map((s) => (
                <button
                  key={s.id}
                  role="radio"
                  aria-checked={staffChoice === s.id}
                  onClick={() => setStaffChoice(s.id)}
                  className={`text-left rounded-xl border px-4 min-h-14 py-2 text-base font-bold text-[#0F172A] transition-colors ${
                    staffChoice === s.id ? "bg-[#8B5CF6]/20 border-[#A78BFA]" : "bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1]"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* 4. Date & time */}
      {customer && chosen.length > 0 && eligibleStaff.length > 0 && (
        <Panel title={`4. ${t("book.step.time")}`}>
          <div className="space-y-4">
            <div>
              <p className={labelClass}>{t("book.chooseDate")}</p>
              <div className="flex flex-wrap gap-3">
                <button className={date === isoDay(0) ? btnPrimary : btnSecondary} onClick={() => setDate(isoDay(0))}>{t("book.today")}</button>
                <button className={date === isoDay(1) ? btnPrimary : btnSecondary} onClick={() => setDate(isoDay(1))}>{t("book.tomorrow")}</button>
                <input
                  type="date"
                  aria-label={t("book.chooseDate")}
                  min={isoDay(0)}
                  value={date}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  className={`${inputClass} !w-auto`}
                />
              </div>
            </div>

            <div>
              <p className={labelClass}>{t("book.chooseTime")}</p>
              {slotsLoading ? (
                <div className="flex items-center gap-2 text-base text-[#334155]" role="status">
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> {t("common.loading")}
                </div>
              ) : slots.length === 0 ? (
                <EmptyState text={slotsError || t("book.noSlots")} />
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2" role="radiogroup" aria-label={t("book.chooseTime")}>
                  {slots.map((s) => (
                    <button
                      key={s.time}
                      role="radio"
                      aria-checked={time === s.time}
                      onClick={() => setTime(s.time)}
                      className={`min-h-12 rounded-xl border text-base font-bold transition-colors ${
                        time === s.time ? "bg-[#8B5CF6] border-[#8B5CF6] text-white" : "bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] hover:border-[#A78BFA]"
                      }`}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>
      )}

      {/* 5. Confirm */}
      {ready && customer && slot && (
        <Panel title={`5. ${t("book.summary")}`}>
          <dl className="space-y-2 text-base">
            <div className="flex justify-between gap-4"><dt className="text-[#334155]">{t("book.step.customer")}</dt><dd className="font-bold text-[#0F172A] text-right">{customer.name} · {customer.phone}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#334155]">{t("book.step.service")}</dt><dd className="font-bold text-[#0F172A] text-right">{chosen.map((s) => s.name).join(", ")}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#334155]">{t("book.step.staff")}</dt><dd className="font-bold text-[#0F172A] text-right">{staffName}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#334155]">{t("book.step.time")}</dt><dd className="font-bold text-[#0F172A] text-right">{date} · {slot.time} ({t("book.duration", { n: minutes })})</dd></div>
            <div className="flex justify-between gap-4 pt-2 border-t border-[#E2E8F0]"><dt className="text-[#334155]">{t("common.total")}</dt><dd className="text-xl font-extrabold text-[#0F172A]">{formatMoney(total)}</dd></div>
          </dl>

          <details className="mt-4">
            <summary className="cursor-pointer text-base font-semibold text-[#6D28D9] min-h-11 flex items-center">{t("common.advanced")}</summary>
            <div className="mt-2">
              <label htmlFor="notes" className={labelClass}>{t("book.notes")} ({t("common.optional")})</label>
              <textarea id="notes" rows={2} className={`${inputClass} py-3`} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </details>

          <button className={`${btnPrimary} w-full mt-5 text-lg min-h-14`} disabled={saving} onClick={submit}>
            {saving ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> : <Check className="w-5 h-5" aria-hidden />}
            {t("book.create")}
          </button>
        </Panel>
      )}
    </div>
  );
}

