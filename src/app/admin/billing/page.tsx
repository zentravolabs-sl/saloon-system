"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Banknote,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Globe,
  Loader2,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useT } from "@/context/I18nContext";
import {
  Banner,
  EmptyState,
  PageLoading,
  Panel,
  StatusBadge,
  btnPrimary,
  btnSecondary,
  btnSmall,
  formatMoney,
  inputClass,
  labelClass,
} from "@/components/admin/ui";

interface Appointment {
  id: string;
  reference: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  paidAmount: number;
  discountAmount: number;
  customer?: { id: string; name: string; phone: string };
  staff?: { id: string; name: string };
  branch?: { id: string; name: string };
  services?: { service: { id: string; name: string; price: number; duration: number } }[];
  invoice?: { id: string; invoiceNumber: string } | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number | string;
  unit: string;
  onHand: string;
}

interface CartProduct {
  product: Product;
  quantity: number;
  unitPrice: number;
}

function BillingContent() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const preselectedBookingId = searchParams.get("booking");
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canDiscount = role === "SALON_OWNER" || role === "MANAGER";

  // Step 1: Appointment selection
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllStatuses, setShowAllStatuses] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  // Step 2 & 3: Optional products
  const [productSearch, setProductSearch] = useState("");
  const [foundProducts, setFoundProducts] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [cartProducts, setCartProducts] = useState<CartProduct[]>([]);

  // Step 4: Discount (if authorized)
  const [discountInput, setDiscountInput] = useState<string>("0");

  // Step 5: Payment method
  const [method, setMethod] = useState<"CASH" | "CARD" | "ONLINE" | "BANK">("CASH");
  const [receivedAmount, setReceivedAmount] = useState<string>("");

  // Processing & result
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completedResult, setCompletedResult] = useState<{
    bookingRef: string;
    customerName: string;
    amountPaid: number;
    method: string;
    invoiceId?: string;
  } | null>(null);

  // Load unpaid / active appointments
  const fetchAppointments = async () => {
    setLoadingAppts(true);
    try {
      const res = await fetch("/api/bookings?limit=100");
      const data = await res.json();
      if (data.bookings) {
        setAppointments(data.bookings);
        if (preselectedBookingId) {
          const match = data.bookings.find((b: Appointment) => b.id === preselectedBookingId);
          if (match) selectAppointment(match);
        }
      }
    } catch {
      setError(t("common.errorGeneric"));
    } finally {
      setLoadingAppts(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [preselectedBookingId]);

  // Product search
  useEffect(() => {
    const q = productSearch.trim();
    if (q.length < 2) {
      setFoundProducts([]);
      return;
    }
    setSearchingProducts(true);
    const timer = setTimeout(() => {
      fetch(`/api/inventory/products?search=${encodeURIComponent(q)}&limit=6`)
        .then((r) => r.json())
        .then((d) => setFoundProducts(d.products || []))
        .catch(() => setFoundProducts([]))
        .finally(() => setSearchingProducts(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const selectAppointment = (appt: Appointment) => {
    setSelectedAppt(appt);
    setCartProducts([]);
    setDiscountInput("0");
    setReceivedAmount("");
    setError("");
  };

  // Calculations
  const servicesTotal = selectedAppt
    ? Math.max(0, selectedAppt.totalAmount - (selectedAppt.paidAmount || 0))
    : 0;

  const productsTotal = cartProducts.reduce(
    (acc, item) => acc + item.quantity * item.unitPrice,
    0
  );

  const discountNum = Math.max(0, Number(discountInput) || 0);
  const subtotalBeforeDiscount = servicesTotal + productsTotal;
  const grandTotal = Math.max(0, subtotalBeforeDiscount - discountNum);

  // Set default received amount to match grandTotal
  useEffect(() => {
    if (grandTotal > 0 && !receivedAmount) {
      setReceivedAmount(String(grandTotal));
    }
  }, [grandTotal]);

  const receivedNum = Number(receivedAmount) || 0;
  const changeDue = Math.max(0, receivedNum - grandTotal);

  // Filtered appointments for step 1
  const filteredAppointments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return appointments.filter((b) => {
      // By default show COMPLETED and IN_PROGRESS / CHECKED_IN
      const isCandidate = showAllStatuses
        ? b.status !== "CANCELLED" && b.status !== "REJECTED"
        : (b.status === "COMPLETED" || b.status === "IN_PROGRESS" || b.status === "CHECKED_IN") &&
          b.paymentStatus !== "PAID";

      if (!isCandidate) return false;
      if (!q) return true;
      return (
        b.reference.toLowerCase().includes(q) ||
        (b.customer?.name || "").toLowerCase().includes(q) ||
        (b.customer?.phone || "").includes(q)
      );
    });
  }, [appointments, searchQuery, showAllStatuses]);

  // Product cart manipulation
  const addProductToCart = (prod: Product) => {
    setCartProducts((prev) => {
      const existing = prev.find((i) => i.product.id === prod.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        { product: prod, quantity: 1, unitPrice: Number(prod.sellingPrice) || 0 },
      ];
    });
    setProductSearch("");
    setFoundProducts([]);
  };

  const removeCartProduct = (productId: string) => {
    setCartProducts((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateProductQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeCartProduct(productId);
      return;
    }
    setCartProducts((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i))
    );
  };

  // Checkout submission
  const handleCheckout = async () => {
    if (!selectedAppt) return;
    setSubmitting(true);
    setError("");

    try {
      // Step A: Mark booking COMPLETED if it wasn't already
      let invoiceId = selectedAppt.invoice?.id;
      if (selectedAppt.status !== "COMPLETED") {
        const compRes = await fetch(`/api/bookings/${selectedAppt.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "COMPLETED" }),
        });
        if (!compRes.ok) {
          const cData = await compRes.json();
          throw new Error(cData.error || "Failed to mark appointment completed");
        }
      }

      // Step B: Record product retail sale if any items were added
      if (cartProducts.length > 0) {
        const branchId = selectedAppt.branch?.id;
        if (!branchId) throw new Error("Branch missing from booking");

        const salePayload = {
          branchId,
          customerId: selectedAppt.customer?.id,
          bookingId: selectedAppt.id,
          staffId: selectedAppt.staff?.id,
          items: cartProducts.map((cp) => ({
            productId: cp.product.id,
            quantity: String(cp.quantity),
            unitPrice: String(cp.unitPrice),
            discountAmount: "0",
          })),
          payments: [
            {
              amount: String(productsTotal),
              method,
            },
          ],
        };

        const saleRes = await fetch("/api/pos/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(salePayload),
        });

        if (!saleRes.ok) {
          const sData = await saleRes.json();
          throw new Error(sData.error || "Failed to record product sales");
        }
      }

      // Step C: Record service payment via /api/payments
      const paymentAmount = Math.max(0, servicesTotal - discountNum);
      if (paymentAmount > 0 || discountNum > 0) {
        const payRes = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: selectedAppt.id,
            amount: paymentAmount > 0 ? paymentAmount : 0.01, // payment record
            method,
            discountAmount: discountNum,
            notes: `Checkout completed via simplified billing`,
          }),
        });

        if (!payRes.ok) {
          const pData = await payRes.json();
          throw new Error(pData.error || "Failed to complete payment");
        }
      }

      // Step D: Retrieve invoice ID for printing receipt
      try {
        const invRes = await fetch(`/api/invoices?search=${encodeURIComponent(selectedAppt.reference)}`);
        const invData = await invRes.json();
        if (invData.invoices && invData.invoices.length > 0) {
          invoiceId = invData.invoices[0].id;
        }
      } catch {
        /* invoice link fallback */
      }

      setCompletedResult({
        bookingRef: selectedAppt.reference,
        customerName: selectedAppt.customer?.name || "Customer",
        amountPaid: grandTotal,
        method,
        invoiceId,
      });
    } catch (err: any) {
      setError(err.message || t("common.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setSelectedAppt(null);
    setCartProducts([]);
    setDiscountInput("0");
    setReceivedAmount("");
    setCompletedResult(null);
    setError("");
    fetchAppointments();
  };

  // SUCCESS STATE
  if (completedResult) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-fadeIn">
        <Panel>
          <div className="text-center space-y-4 py-6">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
            <h1 className="text-2xl font-black text-white">{t("pay.done")}</h1>
            <p className="text-base text-[#D1D5DB]">
              {completedResult.customerName} &bull; {completedResult.bookingRef}
            </p>
            <div className="py-3 px-6 rounded-2xl bg-white/5 border border-white/10 max-w-xs mx-auto">
              <span className="text-xs text-[#9CA3AF] uppercase font-semibold">
                {t("common.total")} {t("common.paid")}
              </span>
              <p className="text-3xl font-black text-emerald-400 mt-0.5">
                {formatMoney(completedResult.amountPaid)}
              </p>
              <span className="text-xs text-white/60 font-medium">via {completedResult.method}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              {completedResult.invoiceId ? (
                <Link
                  href={`/admin/invoices/${completedResult.invoiceId}`}
                  target="_blank"
                  className={btnPrimary}
                >
                  <Printer className="w-5 h-5" />
                  <span>{t("pay.receipt")}</span>
                </Link>
              ) : (
                <Link href="/admin/invoices" className={btnPrimary}>
                  <Receipt className="w-5 h-5" />
                  <span>{t("nav.receipts")}</span>
                </Link>
              )}
              <button onClick={resetAll} className={btnSecondary}>
                <Plus className="w-5 h-5" />
                <span>{t("pay.next")}</span>
              </button>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{t("pay.title")}</h1>
          <p className="text-sm text-[#9CA3AF] mt-0.5">
            Quick 1-click checkout for salon services and retail products
          </p>
        </div>
        {selectedAppt && (
          <button onClick={() => setSelectedAppt(null)} className={btnSecondary}>
            <X className="w-4 h-4" />
            <span>Switch Appointment</span>
          </button>
        )}
      </div>

      {error && <Banner kind="error" onClose={() => setError("")}>{error}</Banner>}

      {/* STEP 1: Select Appointment if none is selected */}
      {!selectedAppt ? (
        <Panel title={t("pay.pickAppointment")}>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("pay.search")}
                  className={`${inputClass} pl-12`}
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-[#D1D5DB] cursor-pointer shrink-0 select-none px-2">
                <input
                  type="checkbox"
                  checked={showAllStatuses}
                  onChange={(e) => setShowAllStatuses(e.target.checked)}
                  className="rounded w-4 h-4 accent-[#8B5CF6]"
                />
                <span>{t("pay.showAll")}</span>
              </label>
            </div>

            {loadingAppts ? (
              <PageLoading label={t("common.loading")} />
            ) : filteredAppointments.length === 0 ? (
              <EmptyState text={t("pay.noneToPay")} icon={Receipt} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredAppointments.map((appt) => {
                  const bal = Math.max(0, appt.totalAmount - (appt.paidAmount || 0));
                  return (
                    <button
                      key={appt.id}
                      onClick={() => selectAppointment(appt)}
                      className="text-left p-4 rounded-xl bg-[#131524] border border-white/10 hover:border-[#8B5CF6] transition-all flex flex-col justify-between gap-3 group"
                    >
                      <div className="space-y-1 w-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-white text-base">
                            {appt.startTime}
                          </span>
                          <StatusBadge status={appt.status} />
                        </div>
                        <p className="font-bold text-white text-base group-hover:text-[#A78BFA] transition-colors">
                          {appt.customer?.name || "Walk-in"}
                        </p>
                        <p className="text-xs text-[#9CA3AF]">
                          {appt.customer?.phone} &bull; {appt.branch?.name}
                        </p>
                        <p className="text-xs text-[#D1D5DB] line-clamp-1">
                          {appt.services?.map((s) => s.service.name).join(", ")}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-white/10 w-full flex items-center justify-between">
                        <span className="text-xs text-[#9CA3AF]">{t("common.balance")}:</span>
                        <span className="text-base font-black text-amber-300">
                          {formatMoney(bal)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>
      ) : (
        /* STEP 2-6: Fast Checkout View */
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Column: Appointment summary & optional products */}
          <div className="md:col-span-2 space-y-6">
            {/* Appointment summary */}
            <Panel title="1. Appointment Details">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {selectedAppt.customer?.name}
                    </h2>
                    <p className="text-sm text-[#9CA3AF]">
                      {selectedAppt.customer?.phone} &bull; {selectedAppt.branch?.name}
                    </p>
                    <p className="text-xs text-[#A78BFA] font-medium mt-0.5">
                      Stylist: {selectedAppt.staff?.name || "Any"} &bull; {selectedAppt.startTime}
                    </p>
                  </div>
                  <StatusBadge status={selectedAppt.status} />
                </div>

                <div className="pt-3 border-t border-white/10 space-y-2">
                  <span className="text-xs font-bold uppercase text-[#9CA3AF] tracking-wider">
                    {t("pay.services")}
                  </span>
                  {selectedAppt.services?.map((bs, i) => (
                    <div key={i} className="flex justify-between items-center text-sm py-1">
                      <span className="text-white font-medium">{bs.service.name}</span>
                      <span className="text-white font-bold">{formatMoney(bs.service.price)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5 font-bold">
                    <span className="text-[#9CA3AF]">Service Subtotal</span>
                    <span className="text-white">{formatMoney(servicesTotal)}</span>
                  </div>
                </div>
              </div>
            </Panel>

            {/* Step 3: Add optional products */}
            <Panel title={t("pay.addProducts")}>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="search"
                    placeholder={t("pay.productSearch")}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className={`${inputClass} pl-12`}
                  />
                  {searchingProducts && (
                    <Loader2 className="w-5 h-5 animate-spin absolute right-4 top-1/2 -translate-y-1/2 text-[#A78BFA]" />
                  )}
                </div>

                {foundProducts.length > 0 && (
                  <ul className="rounded-xl border border-white/10 bg-[#131524] divide-y divide-white/10 max-h-48 overflow-y-auto">
                    {foundProducts.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => addProductToCart(p)}
                          className="w-full text-left p-3 hover:bg-white/5 flex items-center justify-between text-sm"
                        >
                          <div>
                            <span className="font-bold text-white block">{p.name}</span>
                            <span className="text-xs text-[#9CA3AF]">
                              {p.sku} &bull; Stock: {p.onHand} {p.unit}
                            </span>
                          </div>
                          <span className="font-bold text-[#A78BFA]">
                            +{formatMoney(Number(p.sellingPrice))}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {cartProducts.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold uppercase text-[#9CA3AF] tracking-wider">
                      Selected Retail Products
                    </span>
                    <ul className="divide-y divide-white/10">
                      {cartProducts.map((item) => (
                        <li key={item.product.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <span className="font-semibold text-white block truncate">
                              {item.product.name}
                            </span>
                            <span className="text-xs text-[#9CA3AF]">
                              {formatMoney(item.unitPrice)} each
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateProductQty(item.product.id, parseInt(e.target.value) || 1)
                              }
                              className="w-14 min-h-9 px-2 text-center rounded-lg bg-[#181B2B] border border-white/20 text-white font-bold"
                            />
                            <span className="font-bold text-white min-w-16 text-right">
                              {formatMoney(item.quantity * item.unitPrice)}
                            </span>
                            <button
                              onClick={() => removeCartProduct(item.product.id)}
                              className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Panel>
          </div>

          {/* Right Column: Totals, Discounts, Payment & Action */}
          <div className="space-y-6">
            <Panel title="2. Total & Payment">
              <div className="space-y-4">
                {/* Price Breakdown */}
                <dl className="space-y-2 text-sm border-b border-white/10 pb-4">
                  <div className="flex justify-between">
                    <dt className="text-[#9CA3AF]">{t("pay.subtotal")}:</dt>
                    <dd className="font-semibold text-white">{formatMoney(servicesTotal)}</dd>
                  </div>
                  {productsTotal > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-[#9CA3AF]">{t("pay.products")}:</dt>
                      <dd className="font-semibold text-white">+{formatMoney(productsTotal)}</dd>
                    </div>
                  )}

                  {/* Step 4: Discount */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[#D1D5DB]">{t("pay.discount")}:</span>
                      {!canDiscount && (
                        <span className="text-[10px] text-amber-300">Manager only</span>
                      )}
                    </div>
                    {canDiscount ? (
                      <input
                        type="number"
                        min="0"
                        max={subtotalBeforeDiscount}
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value)}
                        placeholder="0.00"
                        className={inputClass}
                      />
                    ) : (
                      <p className="text-xs text-[#9CA3AF] italic">{t("pay.discountHint")}</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-white/10">
                    <dt className="text-base font-extrabold text-white">{t("pay.grandTotal")}:</dt>
                    <dd className="text-2xl font-black text-emerald-400">
                      {formatMoney(grandTotal)}
                    </dd>
                  </div>
                </dl>

                {/* Step 5: Payment method selection */}
                <div className="space-y-2">
                  <label className={labelClass}>{t("pay.method")}</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMethod("CASH")}
                      className={`p-3 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
                        method === "CASH"
                          ? "bg-[#8B5CF6] border-[#8B5CF6] text-white"
                          : "bg-[#131524] border-white/10 text-[#D1D5DB] hover:bg-white/5"
                      }`}
                    >
                      <Banknote className="w-5 h-5" />
                      <span>{t("common.cash")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMethod("CARD")}
                      className={`p-3 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
                        method === "CARD"
                          ? "bg-[#8B5CF6] border-[#8B5CF6] text-white"
                          : "bg-[#131524] border-white/10 text-[#D1D5DB] hover:bg-white/5"
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>{t("common.card")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMethod("ONLINE")}
                      className={`p-3 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
                        method === "ONLINE" || method === "BANK"
                          ? "bg-[#8B5CF6] border-[#8B5CF6] text-white"
                          : "bg-[#131524] border-white/10 text-[#D1D5DB] hover:bg-white/5"
                      }`}
                    >
                      <Globe className="w-5 h-5" />
                      <span>{t("common.online")}</span>
                    </button>
                  </div>
                </div>

                {/* If Cash: Amount received & Change calculation */}
                {method === "CASH" && (
                  <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <label htmlFor="received" className="block text-xs font-bold text-[#D1D5DB] mb-1">
                        {t("pay.amountReceived")}
                      </label>
                      <input
                        id="received"
                        type="number"
                        min="0"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    {receivedNum > grandTotal && (
                      <div className="flex justify-between items-center text-sm pt-1">
                        <span className="text-[#9CA3AF] font-semibold">{t("pay.change")}:</span>
                        <span className="text-lg font-black text-amber-300">
                          {formatMoney(changeDue)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Complete Button */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={submitting}
                  className={`${btnPrimary} w-full text-base min-h-14 mt-4`}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  <span>{t("pay.complete")}</span>
                </button>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<PageLoading label="Loading billing..." />}>
      <BillingContent />
    </Suspense>
  );
}

