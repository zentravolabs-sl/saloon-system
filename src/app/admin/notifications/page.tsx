"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";

const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
  BOOKING_CREATED: { icon: Calendar, color: "text-blue-400 bg-blue-400/10" },
  BOOKING_CONFIRMED: { icon: CheckCircle2, color: "text-green-400 bg-green-400/10" },
  BOOKING_REJECTED: { icon: XCircle, color: "text-red-400 bg-red-400/10" },
  BOOKING_CANCELLED: { icon: XCircle, color: "text-red-400 bg-red-400/10" },
  BOOKING_RESCHEDULED: { icon: RefreshCw, color: "text-blue-400 bg-blue-400/10" },
  APPOINTMENT_REMINDER: { icon: Bell, color: "text-yellow-400 bg-yellow-400/10" },
  BRANCH_CLOSURE: { icon: AlertTriangle, color: "text-orange-400 bg-orange-400/10" },
  APPOINTMENT_COMPLETED: { icon: CheckCircle2, color: "text-emerald-400 bg-emerald-400/10" },
  GENERAL: { icon: Info, color: "text-purple-400 bg-purple-400/10" },
};

function timeAgo(date: string) {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState("all");

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markAsRead = async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } finally {
      setMarkingAll(false);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "read") return n.isRead;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-xl bg-[#EC4899]/20 border border-[#EC4899]/30 text-[#EC4899] text-sm font-bold">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">System alerts and booking activity notifications</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchNotifications}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-[var(--text-secondary)] hover:text-white transition-all"
            >
              {markingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { id: "all", label: "All" },
          { id: "unread", label: `Unread (${unreadCount})` },
          { id: "read", label: "Read" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === tab.id
                ? "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20"
                : "bg-white/5 text-[var(--text-muted)] hover:text-white border border-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <Bell className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <p className="text-white font-semibold">No notifications</p>
          <p className="text-sm text-[var(--text-muted)]">You're all caught up!</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-white/5">
          {filtered.map((notification) => {
            const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.GENERAL;
            const IconComp = config.icon;
            return (
              <div
                key={notification.id}
                onClick={() => !notification.isRead && markAsRead(notification.id)}
                className={`flex items-start gap-4 p-4 transition-colors cursor-pointer ${
                  !notification.isRead
                    ? "bg-[#8B5CF6]/5 hover:bg-[#8B5CF6]/10"
                    : "hover:bg-white/2"
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${config.color}`}>
                  <IconComp className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold ${!notification.isRead ? "text-white" : "text-[var(--text-secondary)]"}`}>
                      {notification.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-[var(--text-muted)]">{timeAgo(notification.createdAt)}</span>
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-[#EC4899] shrink-0" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{notification.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
