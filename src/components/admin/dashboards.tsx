"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle, CalendarCheck, CalendarClock, CheckCircle2, CircleDollarSign, Clock, HandCoins,
  Hourglass, Package, Plus, Scissors, TrendingUp, Users, Wallet,
} from "lucide-react";
import { useT } from "@/context/I18nContext";
import { useSalonStatus } from "@/context/SalonStatusContext";
import { AppointmentRow, DashAppointment } from "@/components/admin/AppointmentRow";
import { Banner, EmptyState, Panel, StatCard, btnPrimary, btnSecondary, formatMoney } from "@/components/admin/ui";

interface Props {
  data: any;
  reload: () => void;
}

function useMessage() {
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  return {
    msg,
    clear: () => setMsg(null),
    set: (kind: "success" | "error", text: string) => setMsg({ kind, text }),
  };
}

function Greeting({ data, children }: { data: any; children?: React.ReactNode }) {
  const { t } = useT();
  const first = String(data.userName || "").split(" ")[0];
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{t("dash.welcome", { name: first })}</h1>
        <p className="text-base text-[#D1D5DB] mt-1">{data.today}</p>
      </div>
      {children && <div className="flex gap-3 flex-wrap">{children}</div>}
    </div>
  );
}

/* ------------------------------ Receptionist ------------------------------ */

export function FrontDeskDashboard({ data, reload }: Props) {
  const { t } = useT();
  const { isApproved } = useSalonStatus();
  const m = useMessage();
  const list: DashAppointment[] = data.appointments || [];
  const c = data.counts;
  const waiting = list.filter((a) => a.status === "CHECKED_IN" || a.status === "IN_PROGRESS");
  const upcoming = list.filter((a) => a.status === "PENDING" || a.status === "CONFIRMED");
  const done = list.filter((a) => a.status === "COMPLETED");

  const section = (title: string, items: DashAppointment[], empty: string) => (
    <Panel title={title}>
      {items.length === 0 ? (
        <EmptyState text={empty} />
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <AppointmentRow key={a.id} appt={a} canBill onChanged={reload} onMessage={m.set} />
          ))}
        </ul>
      )}
    </Panel>
  );

  return (
    <div className="space-y-6 w-full">
      <Greeting data={data}>
        {isApproved && (
          <Link href="/admin/bookings/new" className={btnPrimary}>
            <Plus className="w-5 h-5" aria-hidden /> {t("dash.quickNewBooking")}
          </Link>
        )}
        <Link href="/admin/billing" className={btnSecondary}>
          <HandCoins className="w-5 h-5" aria-hidden /> {t("dash.quickBilling")}
        </Link>
      </Greeting>

      {m.msg && <Banner kind={m.msg.kind} onClose={m.clear}>{m.msg.text}</Banner>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label={t("dash.todaysAppointments")} value={c.total} icon={CalendarCheck} />
        <StatCard label={t("dash.waiting")} value={c.waiting + c.inProgress} icon={Hourglass} tone={c.waiting > 0 ? "warn" : "default"} />
        <StatCard label={t("dash.upcoming")} value={c.upcoming} icon={CalendarClock} />
        <StatCard label={t("dash.completed")} value={c.completed} icon={CheckCircle2} tone="good" href="/admin/billing" />
      </div>

      {c.toBill > 0 && (
        <Banner kind="info">
          {t("dash.unpaidDone", { n: c.toBill })}{" "}
          <Link href="/admin/billing" className="underline font-bold">{t("dash.quickBilling")}</Link>
        </Banner>
      )}

      {list.length === 0 ? (
        <Panel><EmptyState icon={CalendarCheck} text={t("dash.noAppointmentsToday")} /></Panel>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {section(t("dash.waiting"), waiting, t("common.noData"))}
          {section(t("dash.upcoming"), upcoming, t("common.noData"))}
          {section(t("dash.completed"), done, t("common.noData"))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Owner ---------------------------------- */

export function OwnerDashboard({ data, reload }: Props) {
  const { t } = useT();
  const { isApproved } = useSalonStatus();
  const m = useMessage();
  const cur = data.currency;
  const maxRevenue = Math.max(1, ...(data.staffPerformance || []).map((s: any) => s.revenue));
  const profit = data.estimatedProfit as number;

  return (
    <div className="space-y-6 w-full">
      <Greeting data={data}>
        {isApproved && (
          <Link href="/admin/bookings/new" className={btnPrimary}>
            <Plus className="w-5 h-5" aria-hidden /> {t("dash.quickNewBooking")}
          </Link>
        )}
      </Greeting>
      {m.msg && <Banner kind={m.msg.kind} onClose={m.clear}>{m.msg.text}</Banner>}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <StatCard label={t("dash.todaysRevenue")} value={formatMoney(data.todayRevenue, cur)} icon={CircleDollarSign} tone="good" />
        <StatCard label={t("dash.todaysBookings")} value={data.todayBookings} icon={CalendarCheck} href="/admin/bookings" />
        <StatCard label={t("dash.monthlyRevenue")} value={formatMoney(data.monthlyRevenue, cur)} icon={TrendingUp} />
        <StatCard label={t("dash.totalExpenses")} value={formatMoney(data.totalExpenses, cur)} icon={Wallet} href="/admin/expenses" />
        <StatCard
          label={t("dash.estimatedProfit")}
          value={formatMoney(profit, cur)}
          icon={HandCoins}
          tone={profit < 0 ? "bad" : "good"}
        />
        <StatCard
          label={t("dash.lowStock")}
          value={data.lowStock.count}
          icon={Package}
          tone={data.lowStock.count > 0 ? "warn" : "default"}
          href="/admin/inventory"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={t("dash.upcomingAppointments")} action={<Link href="/admin/bookings" className="text-sm font-semibold text-[#C4B5FD] underline">{t("common.viewAll")}</Link>}>
          {data.upcoming.length === 0 ? (
            <EmptyState text={t("dash.noAppointmentsToday")} />
          ) : (
            <ul className="space-y-3">
              {data.upcoming.map((a: DashAppointment) => (
                <AppointmentRow key={a.id} appt={a} onChanged={reload} onMessage={m.set} />
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title={t("dash.staffPerformance")}>
            {data.staffPerformance.length === 0 ? (
              <EmptyState icon={Users} text={t("common.noData")} />
            ) : (
              <ul className="space-y-4">
                {data.staffPerformance.map((s: any) => (
                  <li key={s.staffId}>
                    <div className="flex justify-between text-base text-white">
                      <span className="font-semibold">{s.name}</span>
                      <span>{formatMoney(s.revenue, cur)}</span>
                    </div>
                    <div className="mt-1.5 h-3 rounded-full bg-white/10" aria-hidden>
                      <div className="h-3 rounded-full bg-[#8B5CF6]" style={{ width: `${Math.max(4, (s.revenue / maxRevenue) * 100)}%` }} />
                    </div>
                    <p className="text-sm text-[#9CA3AF] mt-1">{s.completed} ✓</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t("dash.lowStock")} action={<Link href="/admin/inventory" className="text-sm font-semibold text-[#C4B5FD] underline">{t("common.viewAll")}</Link>}>
            {data.lowStock.items.length === 0 ? (
              <EmptyState icon={Package} text={t("dash.lowStockNone")} />
            ) : (
              <ul className="divide-y divide-white/10">
                {data.lowStock.items.map((i: any, idx: number) => (
                  <li key={idx} className="py-2.5 flex justify-between gap-3 text-base">
                    <span className="text-white">{i.name} <span className="text-sm text-[#9CA3AF]">· {i.branch}</span></span>
                    <span className="font-bold text-amber-200">{i.quantity} {i.unit}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Manager --------------------------------- */

export function ManagerDashboard({ data }: Props) {
  const { t } = useT();
  const { isApproved } = useSalonStatus();
  const cur = data.currency;
  const b = data.bookings;
  const a = data.alerts;
  const alerts: string[] = [];
  if (a.pendingBookings) alerts.push(t("dash.pendingConfirm", { n: a.pendingBookings }));
  if (a.unpaidDone) alerts.push(t("dash.unpaidDone", { n: a.unpaidDone }));
  if (a.expensesPending) alerts.push(t("dash.expensesToApprove", { n: a.expensesPending }));
  if (a.lowStockCount) alerts.push(t("dash.lowStockCount", { n: a.lowStockCount }));

  const stateStyle: Record<string, string> = {
    available: "bg-emerald-500/20 text-emerald-100",
    busy: "bg-cyan-500/20 text-cyan-100",
    leave: "bg-amber-500/20 text-amber-100",
    off: "bg-zinc-500/25 text-zinc-100",
  };
  const stateLabel: Record<string, string> = {
    available: t("dash.available"),
    busy: t("dash.busy"),
    leave: t("dash.onLeaveShort"),
    off: t("dash.dayOff"),
  };

  return (
    <div className="space-y-6 w-full">
      <Greeting data={data}>
        {isApproved && (
          <Link href="/admin/bookings/new" className={btnPrimary}>
            <Plus className="w-5 h-5" aria-hidden /> {t("dash.quickNewBooking")}
          </Link>
        )}
        <Link href="/admin/billing" className={btnSecondary}>
          <HandCoins className="w-5 h-5" aria-hidden /> {t("dash.quickBilling")}
        </Link>
      </Greeting>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label={t("dash.branchBookings")} value={b.total} icon={CalendarCheck} href="/admin/bookings" />
        <StatCard label={t("dash.waiting")} value={b.waiting + b.inProgress} icon={Hourglass} />
        <StatCard label={t("dash.upcoming")} value={b.pending + b.confirmed} icon={CalendarClock} tone={b.pending > 0 ? "warn" : "default"} />
        <StatCard label={t("dash.completed")} value={b.completed} icon={CheckCircle2} tone="good" />
      </div>

      <Panel title={t("dash.alerts")}>
        {alerts.length === 0 ? (
          <EmptyState icon={CheckCircle2} text={t("dash.noAlerts")} />
        ) : (
          <ul className="space-y-2">
            {alerts.map((text) => (
              <li key={text} className="flex items-center gap-3 text-base text-amber-100 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden /> {text}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={t("dash.staffAvailability")} action={<Link href="/admin/staff" className="text-sm font-semibold text-[#C4B5FD] underline">{t("common.viewAll")}</Link>}>
          {data.staff.length === 0 ? (
            <EmptyState icon={Users} text={t("common.noData")} />
          ) : (
            <ul className="divide-y divide-white/10">
              {data.staff.map((s: any) => (
                <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">{s.name}</p>
                    {s.hours && <p className="text-sm text-[#9CA3AF] flex items-center gap-1"><Clock className="w-3.5 h-3.5" aria-hidden />{s.hours}</p>}
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-sm font-semibold ${stateStyle[s.state]}`}>{stateLabel[s.state]}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t("dash.branchPerformance")}>
          {data.branches.length === 0 ? (
            <EmptyState text={t("common.noData")} />
          ) : (
            <ul className="space-y-3">
              {data.branches.map((br: any) => (
                <li key={br.id} className="rounded-xl bg-[#131524] border border-white/10 p-4">
                  <p className="text-base font-bold text-white">{br.name}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm text-[#D1D5DB]">
                    <div><p className="text-xl font-extrabold text-white">{br.todayBookings}</p>{t("common.today")}</div>
                    <div><p className="text-xl font-extrabold text-white">{br.monthCompleted}</p>{t("dash.completed")}</div>
                    <div><p className="text-xl font-extrabold text-white">{formatMoney(br.monthRevenue, cur)}</p>{t("dash.revenue")}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* --------------------------------- Staff ---------------------------------- */

export function StaffDashboard({ data, reload }: Props) {
  const { t } = useT();
  const m = useMessage();
  const cur = data.currency;

  if (!data.linked) {
    return (
      <div className="w-full space-y-4">
        <Greeting data={data} />
        <Banner kind="info">{t("dash.noStaffProfile")}</Banner>
      </div>
    );
  }

  const hours = data.hours;
  const e = data.earnings;
  const hoursText = hours.onLeave
    ? t("dash.onLeave")
    : hours.working
    ? `${hours.start} - ${hours.end}`
    : t("dash.dayOff");

  return (
    <div className="space-y-6 w-full">
      <Greeting data={data} />
      {m.msg && <Banner kind={m.msg.kind} onClose={m.clear}>{m.msg.text}</Banner>}

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard label={t("dash.myToday")} value={data.today.length} icon={Scissors} />
        <StatCard label={t("dash.myHours")} value={<span className="text-2xl">{hoursText}</span>} icon={Clock} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Panel title={t("dash.myToday")}>
            {data.today.length === 0 ? (
              <EmptyState icon={CalendarCheck} text={t("common.noData")} />
            ) : (
              <ul className="space-y-3">
                {data.today.map((a: DashAppointment) => (
                  <AppointmentRow key={a.id} appt={a} canConfirm={false} showStaff={false} onChanged={reload} onMessage={m.set} />
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t("dash.myUpcoming")}>
            {data.upcoming.length === 0 ? (
              <EmptyState icon={CalendarClock} text={t("common.noData")} />
            ) : (
              <ul className="space-y-3">
                {data.upcoming.map((a: DashAppointment) => (
                  <li key={a.id} className="rounded-xl bg-[#131524] border border-white/10 p-4">
                    <p className="text-sm font-semibold text-[#C4B5FD]">{a.date} · {a.startTime}</p>
                    <p className="text-base font-semibold text-white">{a.customerName}</p>
                    <p className="text-sm text-[#D1D5DB]">{a.services.join(", ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div>
          <Panel
            title={t("dash.myEarnings")}
            action={<Link href="/admin/my-commissions" className="text-sm font-semibold text-[#C4B5FD] underline">{t("common.viewAll")}</Link>}
          >
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-sm text-[#D1D5DB]">{t("dash.earnedPending")}</p><p className="text-xl font-extrabold text-white">{formatMoney(e.pending, cur)}</p></div>
              <div><p className="text-sm text-[#D1D5DB]">{t("dash.earnedApproved")}</p><p className="text-xl font-extrabold text-white">{formatMoney(e.approved, cur)}</p></div>
              <div><p className="text-sm text-[#D1D5DB]">{t("dash.earnedPaid")}</p><p className="text-xl font-extrabold text-emerald-200">{formatMoney(e.paid, cur)}</p></div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

