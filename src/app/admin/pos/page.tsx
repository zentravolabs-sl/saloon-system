"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  Scissors,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  CheckCircle2,
  Printer,
  Receipt,
  RotateCcw,
  Loader2,
  X,
  Tag,
  Package,
  Layers,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  minStockLevel: number;
  isRetail: boolean;
  stockLevels?: Array<{ branchId: string; quantity: number }>;
}

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
}

interface Staff {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

interface RecentSale {
  id: string;
  saleNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  paymentMethod: string;
  customer?: { name: string };
  sellerStaff?: { name: string };
  branch?: { name: string };
  items: Array<{ quantity: number; unitPrice: number; total: number; product: { name: string; sku: string } }>;
  invoice?: { id: string; invoiceNumber: string };
}

export default function ProductPOSPage() {
  const [activeView, setActiveView] = useState<"pos" | "history">("pos");
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);

  // POS State
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  // Status & Modals
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [refundModalSale, setRefundModalSale] = useState<RecentSale | null>(null);
  const [refundReason, setRefundReason] = useState("");

  useEffect(() => {
    fetchInitialData();
    fetchSales();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [prodRes, metaRes, custRes, staffRes] = await Promise.all([
        fetch("/api/inventory/products"),
        fetch("/api/ops/meta"),
        fetch("/api/customers"),
        fetch("/api/staff"),
      ]);
      const prod = await prodRes.json();
      const meta = await metaRes.json();
      const cust = await custRes.json();
      const st = await staffRes.json();

      if (prod.products) {
        setProducts(
          prod.products
            .filter((p: any) => p.isRetail !== false)
            .map((p: any) => ({
              ...p,
              sellingPrice: Number(p.sellingPrice || 0),
              costPrice: Number(p.costPrice || 0),
              stockLevels: p.stockLevels || p.branchStock || [],
            }))
        );
      }
      if (meta.branches) {
        setBranches(meta.branches);
        if (meta.branches.length > 0 && !selectedBranchId) {
          setSelectedBranchId(meta.branches[0].id);
        }
      }
      if (cust.customers) setCustomers(cust.customers);
      if (st.staff) setStaffList(st.staff);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      const res = await fetch("/api/pos/sales");
      const data = await res.json();
      if (data.sales) setRecentSales(data.sales);
    } catch (err) {
      console.error(err);
    }
  };

  const addToCart = (product: Product) => {
    // Check if item in cart
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, quantity: 1, unitPrice: product.sellingPrice }]);
    }
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    const updated = cart
      .map((item) => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as CartItem[];
    setCart(updated);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (subtotal * discountPercent) / 100;
  }, [subtotal, discountPercent]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Cart is empty.");
      return;
    }
    if (!selectedBranchId) {
      alert("Please select a branch.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/pos/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedBranchId,
          customerId: selectedCustomerId || undefined,
          sellerStaffId: selectedStaffId || undefined,
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          discountAmount,
          taxAmount: 0,
          payments: [
            {
              method: paymentMethod,
              amount: totalAmount,
            },
          ],
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to process retail sale");

      setCompletedSale(d.sale);
      setCart([]);
      setDiscountPercent(0);
      setSelectedCustomerId("");
      setSelectedStaffId("");
      fetchInitialData();
      fetchSales();
    } catch (err: any) {
      alert("Checkout error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefund = async () => {
    if (!refundModalSale) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pos/sales/${refundModalSale.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: refundReason,
          restock: true,
          items: refundModalSale.items.map((it: any) => ({
            saleItemId: it.id,
            quantity: it.quantity,
          })),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to refund sale");
      alert("Sale refunded and stock returned to inventory successfully.");
      setRefundModalSale(null);
      setRefundReason("");
      fetchInitialData();
      fetchSales();
    } catch (err: any) {
      alert("Refund error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatLKR = (val: number) => {
    return `Rs. ${Number(val || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filter products by search and branch availability
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!productSearch.trim()) return true;
      const q = productSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    });
  }, [products, productSearch]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-[#8B5CF6]" />
            Retail Point of Sale (POS)
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Sell retail products directly at the counter, auto-deduct stock, issue invoices, and award seller commissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("pos")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === "pos"
                ? "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white"
                : "bg-white/5 text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            Terminal Counter
          </button>
          <button
            onClick={() => {
              setActiveView("history");
              fetchSales();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === "history"
                ? "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white"
                : "bg-white/5 text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            Sales History & Refunds
          </button>
        </div>
      </div>

      {activeView === "pos" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Product Catalog & Search (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Scan barcode or type name / SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#0C0E1A]">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {loading ? (
                <div className="col-span-full p-12 text-center text-[var(--text-muted)]">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8B5CF6] mb-2" />
                  Loading retail products...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full p-8 text-center text-[var(--text-muted)] bg-[#0C0E1A] rounded-2xl border border-white/10">
                  No retail products found. Mark products as "Retail" in the Inventory page.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const stockList = p.stockLevels || (p as any).branchStock || [];
                  const branchStock =
                    Number(stockList.find((sl: any) => sl.branchId === selectedBranchId)?.quantity || 0);
                  const isOutOfStock = branchStock <= 0;

                  return (
                    <button
                      key={p.id}
                      onClick={() => !isOutOfStock && addToCart(p)}
                      disabled={isOutOfStock}
                      className={`p-3.5 rounded-2xl bg-[#0C0E1A] border text-left transition-all flex flex-col justify-between h-36 ${
                        isOutOfStock
                          ? "border-red-500/20 opacity-50 cursor-not-allowed"
                          : "border-white/10 hover:border-[#8B5CF6]/50 active:scale-[0.98]"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-white line-clamp-2">{p.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                          {p.sku}
                        </div>
                      </div>

                      <div className="flex items-end justify-between pt-2 border-t border-white/5">
                        <div>
                          <div className="font-bold text-xs text-emerald-400 font-mono">
                            {formatLKR(p.sellingPrice)}
                          </div>
                          <div
                            className={`text-[10px] font-semibold ${
                              isOutOfStock ? "text-red-400" : "text-white/60"
                            }`}
                          >
                            {isOutOfStock ? "Out of stock" : `${branchStock} ${p.unit} left`}
                          </div>
                        </div>

                        <div className="p-1.5 rounded-lg bg-[#8B5CF6]/20 text-[#A78BFA]">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Checkout Cart (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 sticky top-20">
            <div className="p-5 rounded-2xl bg-[#0C0E1A] border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#8B5CF6]" />
                  Active Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)
                </h3>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-[11px] text-red-400 hover:underline"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              {/* CRM & Staff Selection */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="" className="bg-[#0C0E1A]">Walk-in Customer (Guest)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0C0E1A]">
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Scissors className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="" className="bg-[#0C0E1A]">Seller / Barber (Award Commission)</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#0C0E1A]">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cart Items List */}
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar border-y border-white/5 py-3">
                {cart.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                    No items in cart. Click any product from the catalog on the left.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between gap-2"
                    >
                      <div className="overflow-hidden flex-1">
                        <div className="font-bold text-xs text-white truncate">{item.product.name}</div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          {formatLKR(item.unitPrice)} each
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateCartQuantity(item.product.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold text-xs text-white w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.product.id, 1)}
                          className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Discount & Calculations */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span>Subtotal</span>
                  <span className="font-mono text-white font-semibold">{formatLKR(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)] flex items-center gap-1">
                    <Tag className="w-3 h-3 text-pink-400" />
                    Discount (%)
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-right font-mono text-white"
                    />
                    <span className="text-white/60">%</span>
                  </div>
                </div>

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-pink-400">
                    <span>Discount Deduction</span>
                    <span className="font-mono">- {formatLKR(discountAmount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-sm">
                  <span className="font-bold text-white">Net Total Payable:</span>
                  <span className="font-mono font-black text-emerald-400 text-base">
                    {formatLKR(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-[var(--text-muted)] font-semibold block">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "CASH", label: "Cash", icon: Banknote },
                    { id: "CARD", label: "Card", icon: CreditCard },
                    { id: "ONLINE", label: "Online", icon: Smartphone },
                    { id: "BANK", label: "Bank", icon: Building2 },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSel = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                          isSel
                            ? "bg-[#8B5CF6]/20 border-[#8B5CF6] text-white"
                            : "bg-white/5 border-white/5 text-[var(--text-muted)] hover:text-white"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 text-[#8B5CF6]" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Checkout Action Button */}
              <button
                type="button"
                disabled={cart.length === 0 || submitting}
                onClick={handleCheckout}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold text-sm shadow-lg shadow-[#8B5CF6]/25 hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Sale...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Sale • {formatLKR(totalAmount)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* History & Refunds View */
        <div className="rounded-2xl bg-[#0C0E1A] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[var(--text-muted)] bg-white/[0.02]">
                  <th className="p-3.5 font-bold">Sale #</th>
                  <th className="p-3.5 font-bold">Date</th>
                  <th className="p-3.5 font-bold">Customer</th>
                  <th className="p-3.5 font-bold">Branch</th>
                  <th className="p-3.5 font-bold">Seller Staff</th>
                  <th className="p-3.5 font-bold">Items Sold</th>
                  <th className="p-3.5 font-bold text-right">Total</th>
                  <th className="p-3.5 font-bold text-center">Status</th>
                  <th className="p-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-[var(--text-muted)]">
                      No sales completed yet.
                    </td>
                  </tr>
                ) : (
                  recentSales.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5 font-bold text-white font-mono">{s.saleNumber}</td>
                      <td className="p-3.5 text-[var(--text-secondary)]">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-white">{s.customer?.name || "Walk-in Guest"}</td>
                      <td className="p-3.5 text-[var(--text-secondary)]">{s.branch?.name}</td>
                      <td className="p-3.5 text-purple-400 font-semibold">
                        {s.sellerStaff?.name || "—"}
                      </td>
                      <td className="p-3.5 text-white">
                        {s.items.map((it, idx) => (
                          <div key={idx} className="text-[11px]">
                            {it.quantity} × {it.product.name}
                          </div>
                        ))}
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-400 font-mono">
                        {formatLKR(s.totalAmount)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === "COMPLETED"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {s.invoice && (
                            <a
                              href={`/admin/invoices/${s.invoice.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-white/5 text-[#A78BFA] hover:bg-[#8B5CF6]/20 transition-colors"
                              title="Print Invoice"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {s.status === "COMPLETED" && (
                            <button
                              onClick={() => {
                                setRefundModalSale(s);
                                setRefundReason("");
                              }}
                              className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[11px] font-semibold flex items-center gap-1"
                              title="Refund"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Refund</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMPLETED SALE MODAL */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0C0E1A] border border-white/10 p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Sale Completed!</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                Order #{completedSale.saleNumber}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 text-xs text-[var(--text-muted)] text-left space-y-1">
              <div className="flex justify-between">
                <span>Total Received:</span>
                <b className="text-emerald-400 font-mono">{formatLKR(completedSale.totalAmount)}</b>
              </div>
              <div className="flex justify-between">
                <span>Inventory:</span>
                <span className="text-white">Stock deducted successfully</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setCompletedSale(null)}
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs"
              >
                Close / New Sale
              </button>
              {completedSale.invoice && (
                <a
                  href={`/admin/invoices/${completedSale.invoice.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {refundModalSale && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0C0E1A] border border-white/10 p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 text-red-400">
              <RotateCcw className="w-4 h-4" />
              Refund Sale {refundModalSale.saleNumber}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              This action will refund <b>{formatLKR(refundModalSale.totalAmount)}</b> and automatically return all items to stock.
            </p>
            <textarea
              rows={3}
              required
              placeholder="Reason for refund (e.g. Customer returned sealed item)..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRefundModalSale(null)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 text-xs font-semibold text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={submitting}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white"
              >
                {submitting ? "Processing..." : "Confirm & Restock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
