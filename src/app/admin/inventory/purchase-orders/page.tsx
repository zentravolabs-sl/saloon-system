"use client";

import { useEffect, useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  Truck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  PackageCheck,
  Loader2,
  X,
  Check,
  Trash2,
  Eye,
  DollarSign,
} from "lucide-react";

interface PurchaseOrderItem {
  id: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  product: { id: string; name: string; sku: string; unit: string };
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";
  orderDate: string;
  expectedDeliveryDate?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  supplier: { id: string; name: string };
  branch?: { id: string; name: string };
  items: PurchaseOrderItem[];
  goodsReceipts?: Array<{
    id: string;
    receiptNumber: string;
    receivedAt: string;
    items: Array<{ quantityReceived: number; batchNumber?: string; expiryDate?: string }>;
  }>;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; sku: string; costPrice: number; unit: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [showPOModal, setShowPOModal] = useState(false);
  const [receiveModalPO, setReceiveModalPO] = useState<PurchaseOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // New PO State
  const [poForm, setPoForm] = useState({
    supplierId: "",
    branchId: "",
    expectedDeliveryDate: "",
    notes: "",
    items: [{ productId: "", quantity: 1, unitCost: 0 }],
  });

  // Goods Receipt Form State
  const [grnItems, setGrnItems] = useState<
    Array<{ poItemId: string; productName: string; quantityOrdered: number; quantityReceived: number; batchNumber: string; expiryDate: string }>
  >([]);

  useEffect(() => {
    fetchMeta();
    fetchOrders();
  }, []);

  const fetchMeta = async () => {
    try {
      const [metaRes, supRes, prodRes] = await Promise.all([
        fetch("/api/ops/meta"),
        fetch("/api/inventory/suppliers"),
        fetch("/api/inventory/products"),
      ]);
      const meta = await metaRes.json();
      const sup = await supRes.json();
      const prod = await prodRes.json();

      if (meta.branches) setBranches(meta.branches);
      if (sup.suppliers) setSuppliers(sup.suppliers);
      if (prod.products) setProducts(prod.products);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/purchase-orders");
      const data = await res.json();
      if (data.purchaseOrders) setOrders(data.purchaseOrders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (index: number, productId: string) => {
    const selected = products.find((p) => p.id === productId);
    const updated = [...poForm.items];
    updated[index].productId = productId;
    if (selected) {
      updated[index].unitCost = selected.costPrice || 0;
    }
    setPoForm({ ...poForm, items: updated });
  };

  const handleItemChange = (index: number, field: "quantity" | "unitCost", value: number) => {
    const updated = [...poForm.items];
    updated[index][field] = value;
    setPoForm({ ...poForm, items: updated });
  };

  const addItemRow = () => {
    setPoForm({
      ...poForm,
      items: [...poForm.items, { productId: products[0]?.id || "", quantity: 1, unitCost: products[0]?.costPrice || 0 }],
    });
  };

  const removeItemRow = (index: number) => {
    if (poForm.items.length <= 1) return;
    const updated = poForm.items.filter((_, i) => i !== index);
    setPoForm({ ...poForm, items: updated });
  };

  const poCalculatedTotal = useMemo(() => {
    return poForm.items.reduce((sum, it) => sum + (it.quantity || 0) * (it.unitCost || 0), 0);
  }, [poForm.items]);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.supplierId) {
      alert("Please choose a supplier.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: poForm.supplierId,
          branchId: poForm.branchId || undefined,
          expectedDeliveryDate: poForm.expectedDeliveryDate || undefined,
          notes: poForm.notes,
          items: poForm.items.map((it) => ({
            productId: it.productId,
            quantity: Number(it.quantity),
            unitCost: Number(it.unitCost),
          })),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to create purchase order");
      setShowPOModal(false);
      fetchOrders();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openReceiveModal = (po: PurchaseOrder) => {
    setReceiveModalPO(po);
    setGrnItems(
      po.items.map((it) => ({
        poItemId: it.id,
        productName: it.product.name,
        quantityOrdered: it.quantity,
        quantityReceived: it.quantity,
        batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
        expiryDate: "",
      }))
    );
  };

  const handleGoodsReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveModalPO) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: receiveModalPO.id,
          branchId: receiveModalPO.branch?.id || branches[0]?.id,
          items: grnItems.map((gi) => ({
            purchaseOrderItemId: gi.poItemId,
            quantityReceived: Number(gi.quantityReceived),
            batchNumber: gi.batchNumber || undefined,
            expiryDate: gi.expiryDate || undefined,
          })),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to finalize Goods Receipt");
      setReceiveModalPO(null);
      fetchOrders();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatLKR = (val: number) => {
    return `Rs. ${Number(val || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        o.poNumber.toLowerCase().includes(q) ||
        o.supplier.name.toLowerCase().includes(q) ||
        (o.branch && o.branch.name.toLowerCase().includes(q))
      );
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-[#8B5CF6]" />
            Purchase Orders & Goods Receipts
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Order products from suppliers and receive stock items into branches with automatic inventory updates.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setPoForm({
                supplierId: suppliers[0]?.id || "",
                branchId: branches[0]?.id || "",
                expectedDeliveryDate: "",
                notes: "",
                items: [{ productId: products[0]?.id || "", quantity: 1, unitCost: products[0]?.costPrice || 0 }],
              });
              setShowPOModal(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-2xl bg-[#0C0E1A] border border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search PO number or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
        >
          <option value="ALL" className="bg-[#0C0E1A]">All Statuses</option>
          <option value="DRAFT" className="bg-[#0C0E1A]">Draft</option>
          <option value="ORDERED" className="bg-[#0C0E1A]">Ordered</option>
          <option value="RECEIVED" className="bg-[#0C0E1A]">Received</option>
          <option value="CANCELLED" className="bg-[#0C0E1A]">Cancelled</option>
        </select>
      </div>

      {/* Purchase Orders Table */}
      <div className="rounded-2xl bg-[#0C0E1A] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[var(--text-muted)] bg-white/[0.02]">
                <th className="p-3.5 font-bold">PO #</th>
                <th className="p-3.5 font-bold">Supplier</th>
                <th className="p-3.5 font-bold">Destination Branch</th>
                <th className="p-3.5 font-bold">Order Date</th>
                <th className="p-3.5 font-bold">Expected Date</th>
                <th className="p-3.5 font-bold text-right">Items Count</th>
                <th className="p-3.5 font-bold text-right">Total Amount</th>
                <th className="p-3.5 font-bold text-center">Status</th>
                <th className="p-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[var(--text-muted)]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#8B5CF6] mb-2" />
                    Loading purchase orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[var(--text-muted)]">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-white/[0.02]">
                    <td className="p-3.5 font-bold text-white font-mono">{po.poNumber}</td>
                    <td className="p-3.5 font-semibold text-white">{po.supplier.name}</td>
                    <td className="p-3.5 text-[var(--text-secondary)]">
                      {po.branch?.name || "HQ / Central"}
                    </td>
                    <td className="p-3.5 text-[var(--text-secondary)]">
                      {new Date(po.orderDate).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-[var(--text-secondary)]">
                      {po.expectedDeliveryDate
                        ? new Date(po.expectedDeliveryDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-3.5 text-right font-mono text-[var(--text-secondary)]">
                      {po.items.length} item(s)
                    </td>
                    <td className="p-3.5 text-right font-bold text-white font-mono">
                      {formatLKR(po.totalAmount)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          po.status === "RECEIVED"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : po.status === "ORDERED"
                            ? "bg-blue-500/20 text-blue-400"
                            : po.status === "DRAFT"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {po.status !== "RECEIVED" && po.status !== "CANCELLED" && (
                        <button
                          onClick={() => openReceiveModal(po)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-1 ml-auto"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>Receive Goods (GRN)</span>
                        </button>
                      )}
                      {po.status === "RECEIVED" && po.goodsReceipts?.[0] && (
                        <span className="text-[10px] text-emerald-400 font-mono">
                          GRN: {po.goodsReceipts[0].receiptNumber}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PURCHASE ORDER MODAL */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0C0E1A] border border-white/10 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#8B5CF6]" />
                New Purchase Order
              </h2>
              <button onClick={() => setShowPOModal(false)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Supplier *</label>
                  <select
                    required
                    value={poForm.supplierId}
                    onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="" className="bg-[#0C0E1A]">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#0C0E1A]">{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Delivery Branch</label>
                  <select
                    value={poForm.branchId}
                    onChange={(e) => setPoForm({ ...poForm, branchId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="" className="bg-[#0C0E1A]">All Branches / HQ</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-[#0C0E1A]">{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Expected Delivery</label>
                  <input
                    type="date"
                    value={poForm.expectedDeliveryDate}
                    onChange={(e) => setPoForm({ ...poForm, expectedDeliveryDate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-white">Order Items</label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs text-[#A78BFA] hover:text-white flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {poForm.items.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                      <div className="flex-1">
                        <select
                          required
                          value={row.productId}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          className="w-full bg-transparent text-white focus:outline-none"
                        >
                          <option value="" className="bg-[#0C0E1A]">Select product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id} className="bg-[#0C0E1A]">
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          required
                          placeholder="Qty"
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-right"
                        />
                      </div>

                      <div className="w-28">
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Unit Cost"
                          value={row.unitCost}
                          onChange={(e) => handleItemChange(idx, "unitCost", Number(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-right"
                        />
                      </div>

                      <div className="w-24 text-right font-mono font-bold text-emerald-400">
                        {formatLKR(row.quantity * row.unitCost)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={poForm.items.length <= 1}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="font-semibold text-white">Estimated Total:</span>
                <span className="font-mono font-bold text-base text-emerald-400">
                  {formatLKR(poCalculatedTotal)}
                </span>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Order Notes</label>
                <textarea
                  rows={2}
                  placeholder="Special instructions for the vendor..."
                  value={poForm.notes}
                  onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold"
                >
                  {submitting ? "Creating..." : "Issue Purchase Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GOODS RECEIPT (GRN) MODAL */}
      {receiveModalPO && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#0C0E1A] border border-white/10 p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-emerald-400" />
                  Goods Receipt Note (GRN)
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Receiving PO: <b className="text-white">{receiveModalPO.poNumber}</b> from {receiveModalPO.supplier.name}
                </p>
              </div>
              <button onClick={() => setReceiveModalPO(null)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGoodsReceipt} className="space-y-3.5 text-xs">
              <div className="space-y-3">
                {grnItems.map((gi, idx) => (
                  <div key={gi.poItemId} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{gi.productName}</span>
                      <span className="text-[var(--text-muted)]">
                        Ordered: <b className="text-white">{gi.quantityOrdered}</b>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)] mb-1">Received Qty</label>
                        <input
                          type="number"
                          step="1"
                          required
                          value={gi.quantityReceived}
                          onChange={(e) => {
                            const updated = [...grnItems];
                            updated[idx].quantityReceived = Number(e.target.value);
                            setGrnItems(updated);
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)] mb-1">Batch #</label>
                        <input
                          type="text"
                          value={gi.batchNumber}
                          onChange={(e) => {
                            const updated = [...grnItems];
                            updated[idx].batchNumber = e.target.value;
                            setGrnItems(updated);
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)] mb-1">Expiry Date</label>
                        <input
                          type="date"
                          value={gi.expiryDate}
                          onChange={(e) => {
                            const updated = [...grnItems];
                            updated[idx].expiryDate = e.target.value;
                            setGrnItems(updated);
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px]">
                Upon confirming receipt, items will be added directly into stock, stock batches will be registered, and weighted-average COGS will be updated.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setReceiveModalPO(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold"
                >
                  {submitting ? "Receiving..." : "Confirm & Stock In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
