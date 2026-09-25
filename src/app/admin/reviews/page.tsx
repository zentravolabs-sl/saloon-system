"use client";

import { useEffect, useState } from "react";
import {
  Star,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  Search,
  Filter,
  MessageSquare,
} from "lucide-react";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${n <= rating ? "text-yellow-400 fill-yellow-400" : "text-white/20"}`}
        />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reviews");
      const data = await res.json();
      if (data.reviews) setReviews(data.reviews);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);

  const togglePublish = async (id: string, isPublished: boolean) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !isPublished, isModerated: true }),
      });
      if (res.ok) {
        setReviews((prev) =>
          prev.map((r) => r.id === id ? { ...r, isPublished: !isPublished, isModerated: true } : r)
        );
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = reviews.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || r.customer?.name?.toLowerCase().includes(q) || r.comment?.toLowerCase().includes(q);
    const matchesFilter =
      filter === "all" ||
      (filter === "published" && r.isPublished) ||
      (filter === "hidden" && !r.isPublished) ||
      (filter === "unmoderated" && !r.isModerated);
    return matchesSearch && matchesFilter;
  });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const publishedCount = reviews.filter((r) => r.isPublished).length;
  const pendingCount = reviews.filter((r) => !r.isModerated).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Customer Reviews</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Manage and moderate customer reviews and ratings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Reviews", value: reviews.length, color: "text-purple-400 bg-purple-400/10" },
          { label: "Avg. Rating", value: `⭐ ${avgRating}`, color: "text-yellow-400 bg-yellow-400/10" },
          { label: "Published", value: publishedCount, color: "text-green-400 bg-green-400/10" },
          { label: "Pending Moderation", value: pendingCount, color: "text-orange-400 bg-orange-400/10" },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-xs text-[var(--text-muted)] font-medium mb-1">{s.label}</p>
            <p className={`text-xl font-black ${s.color.split(" ")[0]}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by customer or review content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]/50"
          />
        </div>
        <div className="flex gap-2">
          {["all", "published", "hidden", "unmoderated"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                filter === f
                  ? "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white"
                  : "bg-white/5 text-[var(--text-muted)] hover:text-white border border-white/5"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <p className="text-white font-semibold">No reviews found</p>
          <p className="text-sm text-[var(--text-muted)]">Reviews appear here after customers complete bookings</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => (
            <div key={review.id} className={`card p-5 ${!review.isPublished ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {review.customer?.name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span className="text-sm font-bold text-white">{review.customer?.name}</span>
                      {!review.isModerated && (
                        <span className="px-2 py-0.5 rounded-lg bg-orange-400/10 border border-orange-400/20 text-orange-400 text-xs font-semibold">
                          Needs Review
                        </span>
                      )}
                      {!review.isPublished && (
                        <span className="px-2 py-0.5 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-semibold">
                          Hidden
                        </span>
                      )}
                    </div>

                    {/* Ratings row */}
                    <div className="flex flex-wrap items-center gap-4 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[var(--text-muted)]">Salon:</span>
                        <StarDisplay rating={review.rating || 0} />
                      </div>
                      {review.staffRating && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[var(--text-muted)]">Staff:</span>
                          <StarDisplay rating={review.staffRating} />
                        </div>
                      )}
                      {review.serviceRating && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[var(--text-muted)]">Service:</span>
                          <StarDisplay rating={review.serviceRating} />
                        </div>
                      )}
                    </div>

                    {review.staff && (
                      <p className="text-xs text-[#A78BFA] mb-2">Staff: {review.staff.name}</p>
                    )}

                    {review.comment ? (
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">&ldquo;{review.comment}&rdquo;</p>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] italic">No written comment</p>
                    )}

                    <p className="text-xs text-[var(--text-muted)] mt-2">
                      {new Date(review.createdAt).toLocaleDateString("en-LK", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>

                {/* Moderation Actions */}
                <button
                  onClick={() => togglePublish(review.id, review.isPublished)}
                  disabled={updatingId === review.id}
                  title={review.isPublished ? "Hide Review" : "Publish Review"}
                  className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold ${
                    review.isPublished
                      ? "bg-red-400/10 text-red-400 hover:bg-red-400/20 border border-red-400/20"
                      : "bg-green-400/10 text-green-400 hover:bg-green-400/20 border border-green-400/20"
                  }`}
                >
                  {updatingId === review.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : review.isPublished ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span className="hidden sm:inline">Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Publish</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
