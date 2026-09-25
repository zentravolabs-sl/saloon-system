"use client";

import { useEffect, useState } from "react";
import {
  Star,
  Gift,
  TrendingUp,
  Users,
  Loader2,
  Search,
  Settings,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";

export default function LoyaltyPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loyaltySettings, setLoyaltySettings] = useState({
    pointsPerAmount: 1,
    amountPerPoint: 100,
    minimumRedemption: 100,
    pointsExpireDays: 365,
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/loyalty${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      const data = await res.json();
      if (data.accounts) setAccounts(data.accounts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, [search]);

  const totalPoints = accounts.reduce((sum, a) => sum + a.totalPoints, 0);
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const activeMembers = accounts.filter((a) => a.balance > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Loyalty Program</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Manage customer loyalty points and rewards</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 rounded-xl text-sm font-semibold border border-white/10 bg-white/5 text-[var(--text-secondary)] hover:text-white flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Program Settings
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: accounts.length, icon: Users, color: "text-purple-400 bg-purple-400/10" },
          { label: "Active Members", value: activeMembers, icon: Star, color: "text-yellow-400 bg-yellow-400/10" },
          { label: "Total Points Issued", value: totalPoints.toLocaleString(), icon: Gift, color: "text-green-400 bg-green-400/10" },
          { label: "Points Balance", value: totalBalance.toLocaleString(), icon: TrendingUp, color: "text-blue-400 bg-blue-400/10" },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">{s.label}</p>
                <p className="text-lg font-bold text-white">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="card p-5 border border-[#8B5CF6]/20 bg-[#8B5CF6]/5">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-[#A78BFA]" />
          How Your Loyalty Program Works
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-[#A78BFA]">LKR {loyaltySettings.amountPerPoint}</div>
            <p className="text-xs text-[var(--text-muted)]">Spend to earn</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-[#A78BFA]">1 pt</div>
            <p className="text-xs text-[var(--text-muted)]">Points earned</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-[#A78BFA]">{loyaltySettings.minimumRedemption} pts</div>
            <p className="text-xs text-[var(--text-muted)]">Minimum to redeem</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]/50"
          />
        </div>
      </div>

      {/* Members List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <Gift className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <p className="text-white font-semibold">No loyalty members yet</p>
            <p className="text-sm text-[var(--text-muted)]">Members are created automatically when customers complete bookings</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {accounts.map((account) => (
              <div key={account.id} className="p-4 hover:bg-white/2 transition-colors">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(expandedId === account.id ? null : account.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] flex items-center justify-center text-white font-bold text-sm">
                      {account.customer?.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{account.customer?.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{account.customer?.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-[var(--text-muted)]">Total Earned</p>
                      <p className="text-sm font-bold text-green-400">{account.totalPoints.toLocaleString()} pts</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-[var(--text-muted)]">Used</p>
                      <p className="text-sm font-bold text-orange-400">{account.usedPoints.toLocaleString()} pts</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--text-muted)]">Balance</p>
                      <p className="text-sm font-bold text-[#A78BFA]">{account.balance.toLocaleString()} pts</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-[var(--text-muted)]">Total Spent</p>
                      <p className="text-sm font-bold text-white">LKR {account.customer?.totalSpent?.toLocaleString() || "0"}</p>
                    </div>
                    {expandedId === account.id ? (
                      <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                  </div>
                </div>

                {expandedId === account.id && (
                  <div className="mt-4 pl-13 space-y-3">
                    <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Recent Transactions</h4>
                    {account.transactions?.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">No transactions yet</p>
                    ) : (
                      <div className="space-y-2">
                        {account.transactions?.map((tx: any) => (
                          <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                            <div>
                              <p className="text-sm text-white font-medium">{tx.description || "Points transaction"}</p>
                              <p className="text-xs text-[var(--text-muted)]">{new Date(tx.createdAt).toLocaleDateString()}</p>
                            </div>
                            <span className={`text-sm font-bold ${tx.points > 0 ? "text-green-400" : "text-red-400"}`}>
                              {tx.points > 0 ? "+" : ""}{tx.points} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Loyalty Program Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-[var(--text-muted)] text-xl">×</button>
            </div>
            <div className="space-y-4">
              {[
                { key: "amountPerPoint", label: "Amount to earn 1 point (LKR)", min: 10 },
                { key: "minimumRedemption", label: "Minimum points to redeem", min: 1 },
                { key: "pointsExpireDays", label: "Points expire after (days)", min: 30 },
              ].map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{field.label}</label>
                  <input
                    type="number"
                    min={field.min}
                    value={(loyaltySettings as any)[field.key]}
                    onChange={(e) => setLoyaltySettings((s) => ({ ...s, [field.key]: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#8B5CF6]/50"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSettings(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-[var(--text-secondary)]">
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save to salon settings
                  fetch("/api/settings", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ settings: { loyalty: loyaltySettings } }),
                  }).then(() => setShowSettings(false));
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white text-sm font-bold"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
