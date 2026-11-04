"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  ArrowRightLeft,
  History,
  Layers,
  Scissors,
  DollarSign,
  TrendingUp,
  Tag,
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  X,
  Check,
  Edit,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
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
  isServiceProduct: boolean;
  isActive: boolean;
  category?: { id: string; name: string };
  stockLevels?: Array<{ branchId: string; quantity: number; avgCost: number; branch?: { name: string } }>;
}

interface StockAlert {
  product: { id: string; name: string; sku: string; unit: string; minStockLevel: number };
  branch: { id: string; name: string };
  currentStock: number;
  minStockLevel: number;
  shortage: number;
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  reason?: string;
  createdAt: string;
  product?: { name: string; sku: string; unit: string };
  branch?: { name: string };
  createdByUser?: { name: string };
}

interface Transfer {
  id: string;
  transferNumber: string;
  status: string;
  notes?: string;
  createdAt: string;
  sourceBranch?: { name: string };
  targetBranch?: { name: string };
  items?: Array<{ quantity: number; product: { name: string; unit: string } }>;
  createdByUser?: { name: string };
}

interface ServiceProduct {
  id: string;
  quantity: number;
  service: { id: string; name: string };
  product: { id: string; name: string; unit: string; costPrice: number };
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<
    "products" | "stock" | "movements" | "transfers" | "alerts" | "recipes"
  >("products");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [recipes, setRecipes] = useState<ServiceProduct[]>([]);
  const [services, setServices] = useState<Array<{ id: string; name: string }>>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    categoryId: "",
    unit: "PCS",
    costPrice: "",
    sellingPrice: "",
    minStockLevel: "5",
    isRetail: true,
    isServiceProduct: false,
  });

  const [adjustForm, setAdjustForm] = useState({
    productId: "",
    branchId: "",
    type: "IN",
    quantity: "1",
    unitCost: "",
    reason: "",
    batchNumber: "",
    expiryDate: "",
  });

  const [transferForm, setTransferForm] = useState({
    sourceBranchId: "",
    targetBranchId: "",
    productId: "",
    quantity: "1",
    notes: "",
  });

  const [recipeForm, setRecipeForm] = useState({
    serviceId: "",
    productId: "",
    quantity: "1",
  });

  useEffect(() => {
    fetchMeta();
    fetchProducts();
    fetchAlerts();
  }, []);

  const fetchMeta = async () => {
    try {
      const [metaRes, catRes, svcRes] = await Promise.all([
        fetch("/api/ops/meta"),
        fetch("/api/inventory/categories"),
        fetch("/api/services"),
      ]);
      const meta = await metaRes.json();
      const cat = await catRes.json();
      const svc = await svcRes.json();

      if (meta.branches) setBranches(meta.branches);
      if (cat.categories) setCategories(cat.categories);
      if (svc.services) setServices(svc.services);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "ALL") params.append("categoryId", categoryFilter);
      if (search) params.append("search", search);
      const res = await fetch(`/api/inventory/products?${params.toString()}`);
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/inventory/alerts");
      const data = await res.json();
      if (data.alerts) setAlerts(data.alerts);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMovements = async () => {
    try {
      const res = await fetch("/api/inventory/movements");
      const data = await res.json();
      if (data.movements) setMovements(data.movements);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransfers = async () => {
    try {
      const res = await fetch("/api/inventory/transfers");
      const data = await res.json();
      if (data.transfers) setTransfers(data.transfers);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecipes = async () => {
    try {
      const res = await fetch("/api/inventory/service-products");
      const data = await res.json();
      if (data.serviceProducts) setRecipes(data.serviceProducts);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === "movements") fetchMovements();
    if (activeTab === "transfers") fetchTransfers();
    if (activeTab === "alerts") fetchAlerts();
    if (activeTab === "recipes") fetchRecipes();
  }, [activeTab]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...productForm,
          costPrice: Number(productForm.costPrice),
          sellingPrice: Number(productForm.sellingPrice),
          minStockLevel: Number(productForm.minStockLevel),
          categoryId: productForm.categoryId || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to create product");
      setShowProductModal(false);
      setProductForm({
        name: "",
        sku: "",
        barcode: "",
        categoryId: "",
        unit: "PCS",
        costPrice: "",
        sellingPrice: "",
        minStockLevel: "5",
        isRetail: true,
        isServiceProduct: false,
      });
      fetchProducts();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...adjustForm,
          quantity: Number(adjustForm.quantity),
          unitCost: adjustForm.unitCost ? Number(adjustForm.unitCost) : undefined,
          expiryDate: adjustForm.expiryDate || undefined,
          batchNumber: adjustForm.batchNumber || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to adjust stock");
      setShowAdjustModal(false);
      fetchProducts();
      fetchAlerts();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.sourceBranchId === transferForm.targetBranchId) {
      alert("Source and target branches must be different.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceBranchId: transferForm.sourceBranchId,
          targetBranchId: transferForm.targetBranchId,
          notes: transferForm.notes,
          items: [{ productId: transferForm.productId, quantity: Number(transferForm.quantity) }],
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to transfer stock");
      setShowTransferModal(false);
      fetchProducts();
      fetchTransfers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/service-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: recipeForm.serviceId,
          productId: recipeForm.productId,
          quantity: Number(recipeForm.quantity),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to link recipe");
      setShowRecipeModal(false);
      fetchRecipes();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatLKR = (val: number) => {
    return `Rs. ${Number(val || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Total valuation calculation
  const totalValuation = useMemo(() => {
    return products.reduce((acc, p) => {
      const productTotalQty = p.stockLevels?.reduce((sum, sl) => sum + sl.quantity, 0) || 0;
      return acc + productTotalQty * (p.costPrice || 0);
    }, 0);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    });
  }, [products, search]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-[#8B5CF6]" />
            Inventory & Stock Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Track multi-branch inventory, weighted-average COGS, stock transfers, and backbar service consumption.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (branches.length > 0 && products.length > 0) {
                setTransferForm((f) => ({
                  ...f,
                  sourceBranchId: branches[0]?.id || "",
                  targetBranchId: branches[1]?.id || branches[0]?.id || "",
                  productId: products[0]?.id || "",
                }));
              }
              setShowTransferModal(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Stock</span>
          </button>
          <button
            onClick={() => {
              if (products.length > 0 && branches.length > 0) {
                setAdjustForm((f) => ({
                  ...f,
                  productId: products[0]?.id || "",
                  branchId: branches[0]?.id || "",
                  unitCost: String(products[0]?.costPrice || ""),
                }));
              }
              setShowAdjustModal(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
          >
            <History className="w-3.5 h-3.5" />
            <span>Adjust / In Stock</span>
          </button>
          <button
            onClick={() => setShowProductModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Total Stock Valuation</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white">{formatLKR(totalValuation)}</div>
          <div className="text-[11px] text-emerald-400 mt-1">Weighted-average asset cost</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Catalog Items</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white">{products.length} Products</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            {products.filter((p) => p.isRetail).length} Retail • {products.filter((p) => p.isServiceProduct).length} Service
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-300">{alerts.length} Items</div>
          <div className="text-[11px] text-amber-400/80 mt-1">Below minimum threshold</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Backbar Service Recipes</span>
            <Scissors className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-xl font-bold text-white">{recipes.length} Linked</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">Auto-deducted on completion</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        {[
          { id: "products", label: "Products Catalog", icon: Package },
          { id: "stock", label: "Multi-Branch Stock", icon: Building2 },
          { id: "movements", label: "Movement Audit Log", icon: History },
          { id: "transfers", label: "Branch Transfers", icon: ArrowRightLeft },
          { id: "alerts", label: `Low Stock Alerts (${alerts.length})`, icon: AlertTriangle },
          { id: "recipes", label: "Service Recipes", icon: Scissors },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20"
                  : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PRODUCTS CATALOG */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#0C0E1A] border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search by name, SKU, or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                fetchProducts();
              }}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="ALL" className="bg-[#0C0E1A]">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0C0E1A]">{c.name}</option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl bg-[#0C0E1A] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[var(--text-muted)] bg-white/[0.02]">
                    <th className="p-3.5 font-bold">Product / SKU</th>
                    <th className="p-3.5 font-bold">Category</th>
                    <th className="p-3.5 font-bold">Type</th>
                    <th className="p-3.5 font-bold text-right">Cost Price</th>
                    <th className="p-3.5 font-bold text-right">Selling Price</th>
                    <th className="p-3.5 font-bold text-right">Total In Stock</th>
                    <th className="p-3.5 font-bold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#8B5CF6] mb-2" />
                        Loading products...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">
                        No products found in the catalog.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const totalQty = p.stockLevels?.reduce((sum, sl) => sum + sl.quantity, 0) || 0;
                      const isLow = totalQty <= p.minStockLevel;

                      return (
                        <tr key={p.id} className="hover:bg-white/[0.02]">
                          <td className="p-3.5">
                            <div className="font-bold text-white">{p.name}</div>
                            <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                              <span>SKU: {p.sku}</span>
                              {p.barcode && <span>• Barcode: {p.barcode}</span>}
                            </div>
                          </td>
                          <td className="p-3.5 text-[var(--text-secondary)]">
                            {p.category?.name || "Uncategorized"}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1">
                              {p.isRetail && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                                  RETAIL
                                </span>
                              )}
                              {p.isServiceProduct && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold">
                                  SERVICE
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-right font-mono text-[var(--text-secondary)]">
                            {formatLKR(p.costPrice)}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-white">
                            {formatLKR(p.sellingPrice)}
                          </td>
                          <td className="p-3.5 text-right">
                            <span
                              className={`font-mono font-bold ${
                                isLow ? "text-amber-400" : "text-emerald-400"
                              }`}
                            >
                              {totalQty} {p.unit}
                            </span>
                            {isLow && (
                              <span className="block text-[10px] text-amber-400/80">
                                Min: {p.minStockLevel}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.isActive
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {p.isActive ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-BRANCH STOCK */}
      {activeTab === "stock" && (
        <div className="rounded-2xl bg-[#0C0E1A] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[var(--text-muted)] bg-white/[0.02]">
                  <th className="p-3.5 font-bold">Product</th>
                  <th className="p-3.5 font-bold">SKU</th>
                  {branches.map((b) => (
                    <th key={b.id} className="p-3.5 font-bold text-right">
                      {b.name}
                    </th>
                  ))}
                  <th className="p-3.5 font-bold text-right">Total Qty</th>
                  <th className="p-3.5 font-bold text-right">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products.map((p) => {
                  const totalQty = p.stockLevels?.reduce((sum, sl) => sum + sl.quantity, 0) || 0;
                  const totalValue = totalQty * (p.costPrice || 0);

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5 font-bold text-white">{p.name}</td>
                      <td className="p-3.5 font-mono text-[var(--text-muted)]">{p.sku}</td>
                      {branches.map((b) => {
                        const sl = p.stockLevels?.find((s) => s.branchId === b.id);
                        const qty = sl?.quantity || 0;
                        return (
                          <td
                            key={b.id}
                            className={`p-3.5 text-right font-mono font-semibold ${
                              qty <= p.minStockLevel ? "text-amber-400" : "text-white"
                            }`}
                          >
                            {qty} {p.unit}
                          </td>
                        );
                      })}
                      <td className="p-3.5 text-right font-bold text-white font-mono">
                        {totalQty} {p.unit}
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-400 font-mono">
                        {formatLKR(totalValue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MOVEMENTS LOG */}
      {activeTab === "movements" && (
        <div className="rounded-2xl bg-[#0C0E1A] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[var(--text-muted)] bg-white/[0.02]">
                  <th className="p-3.5 font-bold">Date / Time</th>
                  <th className="p-3.5 font-bold">Product</th>
                  <th className="p-3.5 font-bold">Branch</th>
                  <th className="p-3.5 font-bold">Type</th>
                  <th className="p-3.5 font-bold text-right">Quantity</th>
                  <th className="p-3.5 font-bold text-right">Unit Cost</th>
                  <th className="p-3.5 font-bold text-right">Total Cost</th>
                  <th className="p-3.5 font-bold">Reason / Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5 text-[var(--text-secondary)]">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3.5 font-bold text-white">{m.product?.name}</td>
                      <td className="p-3.5 text-[var(--text-secondary)]">{m.branch?.name}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            m.type.includes("IN") || m.type === "RETURN"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-white">
                        {m.quantity} {m.product?.unit}
                      </td>
                      <td className="p-3.5 text-right font-mono text-[var(--text-secondary)]">
                        {formatLKR(m.unitCost)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-white">
                        {formatLKR(m.totalCost)}
                      </td>
                      <td className="p-3.5 text-[var(--text-muted)]">
                        {m.reason || "Manual adjustment"}
                        {m.createdByUser && (
                          <span className="block text-[10px] text-white/50">
                            by {m.createdByUser.name}
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
      )}

      {/* TAB 4: TRANSFERS */}
      {activeTab === "transfers" && (
        <div className="rounded-2xl bg-[#0C0E1A] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[var(--text-muted)] bg-white/[0.02]">
                  <th className="p-3.5 font-bold">Transfer #</th>
                  <th className="p-3.5 font-bold">Date</th>
                  <th className="p-3.5 font-bold">Source Branch</th>
                  <th className="p-3.5 font-bold">Target Branch</th>
                  <th className="p-3.5 font-bold">Items Transferred</th>
                  <th className="p-3.5 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                      No branch stock transfers recorded yet.
                    </td>
                  </tr>
                ) : (
                  transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5 font-bold text-white font-mono">{t.transferNumber}</td>
                      <td className="p-3.5 text-[var(--text-secondary)]">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-red-400">{t.sourceBranch?.name}</td>
                      <td className="p-3.5 text-emerald-400">{t.targetBranch?.name}</td>
                      <td className="p-3.5 text-white">
                        {t.items?.map((it, idx) => (
                          <div key={idx}>
                            {it.quantity} {it.product?.unit} × {it.product?.name}
                          </div>
                        ))}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ALERTS */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              The following products are currently at or below their reorder thresholds and require stock replenishment.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.length === 0 ? (
              <div className="col-span-full p-8 text-center text-[var(--text-muted)] bg-[#0C0E1A] rounded-2xl border border-white/10">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                All products have healthy stock levels above minimum thresholds!
              </div>
            ) : (
              alerts.map((al, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#0C0E1A] border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      {al.branch.name}
                    </span>
                    <span className="text-[10px] text-red-400 font-bold">
                      Shortage: {al.shortage} {al.product.unit}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-white">{al.product.name}</h3>
                  <div className="text-xs text-[var(--text-muted)] font-mono">SKU: {al.product.sku}</div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <span className="text-[var(--text-muted)]">Current: <b className="text-white">{al.currentStock}</b></span>
                    <span className="text-[var(--text-muted)]">Min Reorder: <b className="text-amber-400">{al.minStockLevel}</b></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: SERVICE RECIPES */}
      {activeTab === "recipes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">
              Map salon services to backbar products. When an appointment is marked completed, the system automatically deducts these quantities from stock and registers the COGS.
            </p>
            <button
              onClick={() => {
                if (services.length > 0 && products.length > 0) {
                  setRecipeForm({
                    serviceId: services[0]?.id || "",
                    productId: products[0]?.id || "",
                    quantity: "1",
                  });
                }
                setShowRecipeModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link Service to Product</span>
            </button>
          </div>

          <div className="rounded-2xl bg-[#0C0E1A] border border-white/10 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[var(--text-muted)] bg-white/[0.02]">
                  <th className="p-3.5 font-bold">Salon Service</th>
                  <th className="p-3.5 font-bold">Consumed Product</th>
                  <th className="p-3.5 font-bold text-right">Quantity Per Service</th>
                  <th className="p-3.5 font-bold text-right">Estimated Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recipes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">
                      No service recipes defined yet. Click "Link Service to Product" to define product consumption.
                    </td>
                  </tr>
                ) : (
                  recipes.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5 font-bold text-white flex items-center gap-2">
                        <Scissors className="w-3.5 h-3.5 text-[#8B5CF6]" />
                        {r.service?.name}
                      </td>
                      <td className="p-3.5 text-white">{r.product?.name}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-purple-400">
                        {r.quantity} {r.product?.unit}
                      </td>
                      <td className="p-3.5 text-right font-mono text-[var(--text-secondary)]">
                        {formatLKR(r.quantity * (r.product?.costPrice || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0C0E1A] border border-white/10 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-[#8B5CF6]" />
                Add New Product
              </h2>
              <button onClick={() => setShowProductModal(false)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. L'Oreal Hair Serum 100ml"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">SKU (Stock Keeping Unit) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LOR-SRM-100"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Barcode / EAN</label>
                  <input
                    type="text"
                    placeholder="e.g. 890123456789"
                    value={productForm.barcode}
                    onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Category</label>
                  <select
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="" className="bg-[#0C0E1A]">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0C0E1A]">{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Unit of Measurement</label>
                  <select
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="PCS" className="bg-[#0C0E1A]">Pieces (PCS)</option>
                    <option value="BOTTLE" className="bg-[#0C0E1A]">Bottle</option>
                    <option value="TUBE" className="bg-[#0C0E1A]">Tube</option>
                    <option value="ML" className="bg-[#0C0E1A]">Milliliters (ML)</option>
                    <option value="G" className="bg-[#0C0E1A]">Grams (G)</option>
                    <option value="BOX" className="bg-[#0C0E1A]">Box</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Cost Price (LKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={productForm.costPrice}
                    onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Selling Price (LKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={productForm.sellingPrice}
                    onChange={(e) => setProductForm({ ...productForm, sellingPrice: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Min Stock Alert</label>
                  <input
                    type="number"
                    required
                    placeholder="5"
                    value={productForm.minStockLevel}
                    onChange={(e) => setProductForm({ ...productForm, minStockLevel: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRetail"
                    checked={productForm.isRetail}
                    onChange={(e) => setProductForm({ ...productForm, isRetail: e.target.checked })}
                    className="rounded border-white/20 bg-white/5 text-[#8B5CF6]"
                  />
                  <label htmlFor="isRetail" className="text-white cursor-pointer select-none">
                    Sellable at retail POS counter
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isServiceProduct"
                    checked={productForm.isServiceProduct}
                    onChange={(e) => setProductForm({ ...productForm, isServiceProduct: e.target.checked })}
                    className="rounded border-white/20 bg-white/5 text-[#8B5CF6]"
                  />
                  <label htmlFor="isServiceProduct" className="text-white cursor-pointer select-none">
                    Internal backbar consumption (shampoo, dyes, creams)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold"
                >
                  {submitting ? "Saving..." : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0C0E1A] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <History className="w-4 h-4 text-[#8B5CF6]" />
                Adjust Stock / Stock In
              </h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStockAdjust} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] mb-1">Product *</label>
                <select
                  required
                  value={adjustForm.productId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#0C0E1A]">{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Branch *</label>
                  <select
                    required
                    value={adjustForm.branchId}
                    onChange={(e) => setAdjustForm({ ...adjustForm, branchId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-[#0C0E1A]">{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Operation Type</label>
                  <select
                    value={adjustForm.type}
                    onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="IN" className="bg-[#0C0E1A]">Stock In (Add)</option>
                    <option value="OUT" className="bg-[#0C0E1A]">Stock Out (Damaged/Lost)</option>
                    <option value="ADJUST" className="bg-[#0C0E1A]">Set Exact Count</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Unit Cost (LKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Defaults to product cost"
                    value={adjustForm.unitCost}
                    onChange={(e) => setAdjustForm({ ...adjustForm, unitCost: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Month-end audit reconciliation, Damaged bottle"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0C0E1A] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#8B5CF6]" />
                Inter-Branch Stock Transfer
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Source Branch *</label>
                  <select
                    required
                    value={transferForm.sourceBranchId}
                    onChange={(e) => setTransferForm({ ...transferForm, sourceBranchId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-[#0C0E1A]">{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Target Branch *</label>
                  <select
                    required
                    value={transferForm.targetBranchId}
                    onChange={(e) => setTransferForm({ ...transferForm, targetBranchId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-[#0C0E1A]">{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1">Product *</label>
                <select
                  required
                  value={transferForm.productId}
                  onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#0C0E1A]">{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1">Quantity *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={transferForm.quantity}
                  onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1">Transfer Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Urgent stock replenishment for weekend bookings"
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SERVICE RECIPE MODAL */}
      {showRecipeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0C0E1A] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#8B5CF6]" />
                Link Service Consumption Recipe
              </h3>
              <button onClick={() => setShowRecipeModal(false)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRecipe} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] mb-1">Salon Service *</label>
                <select
                  required
                  value={recipeForm.serviceId}
                  onChange={(e) => setRecipeForm({ ...recipeForm, serviceId: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#0C0E1A]">{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1">Product Consumed *</label>
                <select
                  required
                  value={recipeForm.productId}
                  onChange={(e) => setRecipeForm({ ...recipeForm, productId: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#0C0E1A]">{p.name} ({p.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1">Quantity Consumed Per Service *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={recipeForm.quantity}
                  onChange={(e) => setRecipeForm({ ...recipeForm, quantity: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  Example: 1 for 1 Tube of hair dye, or 25 for 25ml of shampoo.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowRecipeModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold"
                >
                  Save Recipe Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
