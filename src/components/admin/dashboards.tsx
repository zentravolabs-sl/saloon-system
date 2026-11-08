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
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[24px] border border-white/90 px-5 sm:px-7 py-5 shadow-[0_10px_32px_rgba(91,33,182,0.06)]"
      style={{
        background:
          "linear-gradient(90deg, #F1F0FE 0%, #E9E6FD 40%, #E5E6FB 52%, #E5E6FB 100%)",
      }}
    >
      <div className="flex items-center gap-4">
        <div className="w-[5px] h-14 rounded-full bg-gradient-to-b from-[#6D28D9] via-[#7C3AED] to-[#8B5CF6] shrink-0" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#5B21B6]">{t("dash.welcome", { name: first })}</h1>
          <p className="text-sm font-medium text-[#334155] mt-1">{data.today}</p>
        </div>
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
        <Panel title={t("dash.upcomingAppointments")} action={<Link href="/admin/bookings" className="text-sm font-bold text-[#6D28D9] hover:text-[#5B21B6]">{t("common.viewAll")}</Link>}>
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
                    <div className="flex justify-between text-base text-[#0F172A]">
                      <span className="font-bold">{s.name}</span>
                      <span className="font-semibold text-[#334155]">{formatMoney(s.revenue, cur)}</span>
                    </div>
                    <div className="mt-1.5 h-3 rounded-full bg-[#F1F5F9]" aria-hidden>
                      <div className="h-3 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9]" style={{ width: `${Math.max(4, (s.revenue / maxRevenue) * 100)}%` }} />
                    </div>
                    <p className="text-sm text-[#64748B] mt-1">{s.completed} ✓</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t("dash.lowStock")} action={<Link href="/admin/inventory" className="text-sm font-bold text-[#6D28D9] hover:text-[#5B21B6]">{t("common.viewAll")}</Link>}>
            {data.lowStock.items.length === 0 ? (
              <EmptyState icon={Package} text={t("dash.lowStockNone")} />
            ) : (
              <ul className="divide-y divide-[#E2E8F0]">
                {data.lowStock.items.map((i: any, idx: number) => (
                  <li key={idx} className="py-2.5 flex justify-between gap-3 text-base">
                    <span className="text-[#0F172A] font-medium">{i.name} <span className="text-sm text-[#64748B]">· {i.branch}</span></span>
                    <span className="font-bold text-[#D97706]">{i.quantity} {i.unit}</span>
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
    available: "bg-[#DCFCE7] text-[#15803D]",
    busy: "bg-[#E0F2FE] text-[#0284C7]",
    leave: "bg-[#FEF3C7] text-[#D97706]",
    off: "bg-[#F1F5F9] text-[#475569]",
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
              <li key={text} className="flex items-center gap-3 text-base font-medium text-[#B45309] bg-[#FEF3C7] border border-[#FDE68A] rounded-xl px-4 py-3">
                <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden /> {text}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={t("dash.staffAvailability")} action={<Link href="/admin/staff" className="text-sm font-bold text-[#6D28D9] hover:text-[#5B21B6]">{t("common.viewAll")}</Link>}>
          {data.staff.length === 0 ? (
            <EmptyState icon={Users} text={t("common.noData")} />
          ) : (
            <ul className="divide-y divide-[#E2E8F0]">
              {data.staff.map((s: any) => (
                <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-[#0F172A]">{s.name}</p>
                    {s.hours && <p className="text-sm text-[#64748B] flex items-center gap-1"><Clock className="w-3.5 h-3.5" aria-hidden />{s.hours}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${stateStyle[s.state]}`}>{stateLabel[s.state]}</span>
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
                <li key={br.id} className="rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] p-4">
                  <p className="text-base font-bold text-[#0F172A]">{br.name}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm text-[#475569]">
                    <div><p className="text-xl font-extrabold text-[#0F172A]">{br.todayBookings}</p>{t("common.today")}</div>
                    <div><p className="text-xl font-extrabold text-[#0F172A]">{br.monthCompleted}</p>{t("dash.completed")}</div>
                    <div><p className="text-xl font-extrabold text-[#0F172A]">{formatMoney(br.monthRevenue, cur)}</p>{t("dash.revenue")}</div>
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
                  <li key={a.id} className="rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] p-4">
                    <p className="text-sm font-bold text-[#6D28D9]">{a.date} · {a.startTime}</p>
                    <p className="text-base font-bold text-[#0F172A]">{a.customerName}</p>
                    <p className="text-sm text-[#475569]">{a.services.join(", ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div>
          <Panel
            title={t("dash.myEarnings")}
            action={<Link href="/admin/my-commissions" className="text-sm font-bold text-[#6D28D9] hover:text-[#5B21B6]">{t("common.viewAll")}</Link>}
          >
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-sm text-[#475569]">{t("dash.earnedPending")}</p><p className="text-xl font-extrabold text-[#0F172A]">{formatMoney(e.pending, cur)}</p></div>
              <div><p className="text-sm text-[#475569]">{t("dash.earnedApproved")}</p><p className="text-xl font-extrabold text-[#0F172A]">{formatMoney(e.approved, cur)}</p></div>
              <div><p className="text-sm text-[#475569]">{t("dash.earnedPaid")}</p><p className="text-xl font-extrabold text-[#15803D]">{formatMoney(e.paid, cur)}</p></div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
