"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  Plus,
  Minus,
  Search,
  AlertTriangle,
  History,
  Layers,
  Wallet,
  CheckCircle2,
  Loader2,
  X,
  Eye,
  ChevronDown,
  ChevronUp,
  Scissors,
  PackageX,
  Edit3,
} from "lucide-react";

export type InventorySection = "products" | "stock" | "low-stock" | "history";

export interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  brand?: string | null;
  description?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  unit: string;
  costPrice: string | number | null;
  sellingPrice: string | number;
  minStock: string | number;
  onHand: string | number;
  stockValue?: string | number | null;
  isLow: boolean;
  isOut?: boolean;
  stockStatus?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  trackBatches?: boolean;
  isActive: boolean;
}

interface LowStockItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  categoryName?: string;
  costPrice?: string;
  quantity: string;
  minStock: string;
  shortage?: string;
  severity?: "CRITICAL" | "LOW";
}

interface StockMovementItem {
  id: string;
  type: string;
  quantity: string | number;
  balanceAfter: string | number;
  unitCost?: string | number | null;
  reason?: string | null;
  displayReason?: string;
  createdAt: string;
  createdByName?: string | null;
  product?: { id?: string; name: string; sku: string; unit: string };
}

interface SupplierOption {
  id: string;
  name: string;
}

const UNIT_OPTIONS = [
  { value: "bottle", label: "Bottle" },
  { value: "ml", label: "ml" },
  { value: "g", label: "g" },
  { value: "tube", label: "Tube" },
  { value: "pack", label: "Pack" },
  { value: "pair", label: "Pair" },
  { value: "box", label: "Box" },
  { value: "pcs", label: "Piece" },
];

const ADD_STOCK_REASONS = ["New Purchase", "Stock Correction", "Other"] as const;

const USE_STOCK_REASONS = [
  "Used in Salon",
  "Damaged",
  "Expired",
  "Stock Correction",
  "Other",
] as const;

const HISTORY_REASON_FILTERS = [
  { value: "ALL", label: "All Reasons" },
  { value: "Purchase", label: "Purchased" },
  { value: "Used in salon", label: "Used in salon" },
  { value: "Damaged", label: "Damaged" },
  { value: "Expired", label: "Expired" },
  { value: "Stock Correction", label: "Stock Correction" },
  { value: "Sold to customer", label: "Sold to customer" },
  { value: "Opening stock", label: "Opening stock" },
];

export function formatQty(val: string | number | null | undefined): string {
  const n = Number(val ?? 0);
  if (!Number.isFinite(n)) return "0";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(3).replace(/\.?0+$/, "");
}

export function formatUnitQty(
  val: string | number | null | undefined,
  unit?: string | null
): string {
  const q = formatQty(val);
  const num = Number(val ?? 0);
  const u = (unit || "pcs").trim();
  const uLower = u.toLowerCase();
  if (uLower === "ml" || uLower === "g" || uLower === "kg" || uLower === "l") {
    return `${q} ${uLower}`;
  }
  const singularMap: Record<string, [string, string]> = {
    bottle: ["bottle", "bottles"],
    bottles: ["bottle", "bottles"],
    tube: ["tube", "tubes"],
    tubes: ["tube", "tubes"],
    pack: ["pack", "packs"],
    packs: ["pack", "packs"],
    pair: ["pair", "pairs"],
    pairs: ["pair", "pairs"],
    box: ["box", "boxes"],
    boxes: ["box", "boxes"],
    pcs: ["pc", "pcs"],
    piece: ["piece", "pieces"],
  };
  const pair = singularMap[uLower];
  if (pair) {
    return `${q} ${Math.abs(num) === 1 ? pair[0] : pair[1]}`;
  }
  return `${q} ${u}`;
}

export function formatChangeQty(
  val: string | number | null | undefined,
  unit?: string | null
): string {
  const num = Number(val ?? 0);
  const sign = num > 0 ? "+" : "";
  const q = formatQty(num);
  const u = (unit || "").trim().toLowerCase();
  if (u === "ml" || u === "g" || u === "kg" || u === "l") {
    return `${sign}${q}${u}`;
  }
  return `${sign}${q}`;
}

export function formatRs(val: string | number | null | undefined): string {
  const n = Number(val ?? 0);
  if (!Number.isFinite(n)) return "Rs. 0";
  const isWhole = Math.round(n * 100) / 100 === Math.round(n);
  return `Rs. ${n.toLocaleString("en-LK", {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function InventoryWorkspace({
  initialSection = "products",
}: {
  initialSection?: InventorySection;
}) {
  const pathname = usePathname();

  const resolvedSectionFromPath = useMemo<InventorySection>(() => {
    if (pathname?.endsWith("/stock")) return "stock";
    if (pathname?.endsWith("/low-stock")) return "low-stock";
    if (pathname?.endsWith("/history")) return "history";
    return initialSection;
  }, [pathname, initialSection]);

  const [activeSection, setActiveSection] = useState<InventorySection>(
    resolvedSectionFromPath
  );

  useEffect(() => {
    setActiveSection(resolvedSectionFromPath);
  }, [resolvedSectionFromPath]);

  // Data state
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [movements, setMovements] = useState<StockMovementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(
    null
  );

  // Product / Stock filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"
  >("ALL");

  // History filters
  const [historyProductFilter, setHistoryProductFilter] = useState("ALL");
  const [historyDateFilter, setHistoryDateFilter] = useState("");
  const [historyReasonFilter, setHistoryReasonFilter] = useState("ALL");

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAdvancedProductOptions, setShowAdvancedProductOptions] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [addStockTarget, setAddStockTarget] = useState<InventoryProduct | null>(null);
  const [showAddStockBatchOptions, setShowAddStockBatchOptions] = useState(false);
  const [useStockTarget, setUseStockTarget] = useState<InventoryProduct | null>(null);
  const [viewProductTarget, setViewProductTarget] = useState<InventoryProduct | null>(null);
  const [viewProductDetails, setViewProductDetails] = useState<{
    usedInServices: Array<{ serviceId: string; serviceName: string; quantity: string | number }>;
  } | null>(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [productForm, setProductForm] = useState({
    name: "",
    categoryId: "",
    unit: "bottle",
    costPrice: "",
    sellingPrice: "",
    currentStock: "0",
    lowStockAlert: "3",
    // Advanced Options
    sku: "",
    barcode: "",
    brand: "",
    description: "",
    trackBatches: false,
  });

  const [editProductForm, setEditProductForm] = useState({
    name: "",
    categoryId: "",
    unit: "bottle",
    costPrice: "",
    sellingPrice: "",
    lowStockAlert: "3",
    sku: "",
    barcode: "",
    brand: "",
    description: "",
    trackBatches: false,
  });
  const [showEditAdvanced, setShowEditAdvanced] = useState(false);

  const [addStockForm, setAddStockForm] = useState({
    productId: "",
    quantity: "10",
    unitCost: "",
    reason: "New Purchase",
    customReason: "",
    supplierId: "",
    supplierName: "",
    batchNumber: "",
    expiryDate: "",
  });

  const [useStockForm, setUseStockForm] = useState({
    productId: "",
    quantity: "1",
    reason: "Used in Salon",
    customReason: "",
  });

  // Load initial inventory data
  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, alertRes, supRes] = await Promise.all([
        fetch("/api/inventory/products?limit=200"),
        fetch("/api/inventory/categories"),
        fetch("/api/inventory/alerts"),
        fetch("/api/inventory/suppliers?limit=100"),
      ]);
      const [prodData, catData, alertData, supData] = await Promise.all([
        prodRes.json(),
        catRes.json(),
        alertRes.json(),
        supRes.json(),
      ]);

      if (prodData.products) setProducts(prodData.products);
      if (catData.categories) {
        setCategories(catData.categories);
      }
      if (alertData.lowStock) setLowStockItems(alertData.lowStock);
      if (supData.suppliers) setSuppliers(supData.suppliers);
    } catch (err) {
      console.error("Failed to load inventory data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (historyProductFilter !== "ALL") params.set("productId", historyProductFilter);
      if (historyDateFilter) {
        params.set("from", historyDateFilter);
        params.set("to", historyDateFilter);
      }
      if (historyReasonFilter !== "ALL") {
        params.set("reason", historyReasonFilter);
      }
      const res = await fetch(`/api/inventory/movements?${params.toString()}`);
      const data = await res.json();
      if (data.movements) setMovements(data.movements);
    } catch (err) {
      console.error("Failed to load stock history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  useEffect(() => {
    if (activeSection === "history") {
      fetchMovements();
    }
  }, [activeSection, historyProductFilter, historyDateFilter, historyReasonFilter]);

  // Summary metrics
  const summaryStats = useMemo(() => {
    const totalProducts = products.length;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalStockValue = 0;

    for (const p of products) {
      const qty = Number(p.onHand ?? 0);
      const min = Number(p.minStock ?? 0);
      const val =
        p.stockValue !== null && p.stockValue !== undefined
          ? Number(p.stockValue)
          : Math.max(0, qty) * Number(p.costPrice ?? 0);

      totalStockValue += Number.isFinite(val) ? val : 0;

      if (qty <= 0) {
        outOfStockCount += 1;
      } else if (min > 0 && qty <= min) {
        lowStockCount += 1;
      }
    }

    return {
      totalProducts,
      lowStockCount,
      outOfStockCount,
      alertTotal: lowStockCount + outOfStockCount,
      totalStockValue,
    };
  }, [products]);

  const getProductStatus = (
    p: InventoryProduct
  ): {
    code: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
    label: string;
    badgeClass: string;
  } => {
    const qty = Number(p.onHand ?? 0);
    const min = Number(p.minStock ?? 0);
    if (qty <= 0) {
      return {
        code: "OUT_OF_STOCK",
        label: "Out of Stock",
        badgeClass: "bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]",
      };
    }
    if (min > 0 && qty <= min) {
      return {
        code: "LOW_STOCK",
        label: "Low Stock",
        badgeClass: "bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]",
      };
    }
    return {
      code: "IN_STOCK",
      label: "In Stock",
      badgeClass: "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]",
    };
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== "ALL" && p.category?.id !== categoryFilter) {
        return false;
      }
      if (statusFilter !== "ALL") {
        const st = getProductStatus(p).code;
        if (st !== statusFilter) return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.category?.name && p.category.name.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    });
  }, [products, search, categoryFilter, statusFilter]);

  // Open Add Product Modal
  const openAddProductModal = () => {
    setProductForm({
      name: "",
      categoryId: categories[0]?.id || "",
      unit: "bottle",
      costPrice: "",
      sellingPrice: "",
      currentStock: "10",
      lowStockAlert: "3",
      sku: "",
      barcode: "",
      brand: "",
      description: "",
      trackBatches: false,
    });
    setShowAdvancedProductOptions(false);
    setShowNewCategoryInput(false);
    setNewCategoryName("");
    setShowAddProductModal(true);
  };

  // Create inline category if owner types a new one
  const handleCreateCategoryInline = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    try {
      const res = await fetch("/api/inventory/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.category) {
        setCategories((prev) => [...prev, data.category]);
        setProductForm((prev) => ({ ...prev, categoryId: data.category.id }));
        setShowNewCategoryInput(false);
        setNewCategoryName("");
      } else {
        setBanner({ kind: "error", text: data.error || "Could not create category" });
      }
    } catch {
      setBanner({ kind: "error", text: "Failed to create category" });
    }
  };

  // Handle Create Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setBanner(null);
    try {
      const res = await fetch("/api/inventory/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productForm.name.trim(),
          categoryId: productForm.categoryId || null,
          unit: productForm.unit,
          costPrice: productForm.costPrice || "0",
          sellingPrice: productForm.sellingPrice || "0",
          currentStock: productForm.currentStock || "0",
          minStock: productForm.lowStockAlert || "0",
          lowStockAlert: productForm.lowStockAlert || "0",
          sku: productForm.sku.trim() || null,
          barcode: productForm.barcode.trim() || null,
          brand: productForm.brand.trim() || null,
          description: productForm.description.trim() || null,
          trackBatches: productForm.trackBatches,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not add product");
      }
      setShowAddProductModal(false);
      setBanner({ kind: "success", text: `"${productForm.name.trim()}" added to inventory.` });
      await fetchInventoryData();
      if (activeSection === "history") await fetchMovements();
    } catch (err: any) {
      setBanner({ kind: "error", text: err.message || "Failed to add product" });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Add Stock Modal
  const openAddStock = (prod: InventoryProduct) => {
    setAddStockTarget(prod);
    setShowAddStockBatchOptions(Boolean(prod.trackBatches));
    setAddStockForm({
      productId: prod.id,
      quantity: "10",
      unitCost: prod.costPrice ? String(Number(prod.costPrice)) : "0",
      reason: "New Purchase",
      customReason: "",
      supplierId: "",
      supplierName: "",
      batchNumber: "",
      expiryDate: "",
    });
  };

  // Submit Add Stock
  const handleAddStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStockTarget) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const finalReason =
        addStockForm.reason === "Other" && addStockForm.customReason.trim()
          ? addStockForm.customReason.trim()
          : addStockForm.reason;

      const res = await fetch("/api/inventory/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "IN",
          productId: addStockTarget.id,
          quantity: addStockForm.quantity,
          unitCost: addStockForm.unitCost || String(addStockTarget.costPrice || 0),
          reason: finalReason,
          supplierId: addStockForm.supplierId || null,
          supplierName: addStockForm.supplierName.trim() || null,
          batchNumber: addStockForm.batchNumber.trim() || null,
          expiryDate: addStockForm.expiryDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not add stock");
      }
      const addedQty = formatUnitQty(addStockForm.quantity, addStockTarget.unit);
      const prodName = addStockTarget.name;
      setAddStockTarget(null);
      setBanner({
        kind: "success",
        text: `Added ${addedQty} to ${prodName}.`,
      });
      await fetchInventoryData();
      if (activeSection === "history") await fetchMovements();
    } catch (err: any) {
      setBanner({ kind: "error", text: err.message || "Failed to add stock" });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Use Stock Modal
  const openUseStock = (prod: InventoryProduct) => {
    setUseStockTarget(prod);
    setUseStockForm({
      productId: prod.id,
      quantity: "1",
      reason: "Used in Salon",
      customReason: "",
    });
  };

  // Submit Use Stock
  const handleUseStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!useStockTarget) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const finalReason =
        useStockForm.reason === "Other" && useStockForm.customReason.trim()
          ? useStockForm.customReason.trim()
          : useStockForm.reason;

      const res = await fetch("/api/inventory/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "OUT",
          productId: useStockTarget.id,
          quantity: useStockForm.quantity,
          reason: finalReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not record stock usage");
      }
      const usedQty = formatUnitQty(useStockForm.quantity, useStockTarget.unit);
      const prodName = useStockTarget.name;
      setUseStockTarget(null);
      setBanner({
        kind: "success",
        text: `Recorded ${usedQty} of ${prodName} (${finalReason}).`,
      });
      await fetchInventoryData();
      if (activeSection === "history") await fetchMovements();
    } catch (err: any) {
      setBanner({ kind: "error", text: err.message || "Failed to update stock" });
    } finally {
      setSubmitting(false);
    }
  };

  // Open View / Edit Product Modal
  const openViewProduct = async (prod: InventoryProduct) => {
    setViewProductTarget(prod);
    setIsEditingProduct(false);
    setShowEditAdvanced(false);
    setEditProductForm({
      name: prod.name,
      categoryId: prod.category?.id || "",
      unit: prod.unit || "bottle",
      costPrice: String(Number(prod.costPrice ?? 0)),
      sellingPrice: String(Number(prod.sellingPrice ?? 0)),
      lowStockAlert: String(Number(prod.minStock ?? 0)),
      sku: prod.sku || "",
      barcode: prod.barcode || "",
      brand: prod.brand || "",
      description: prod.description || "",
      trackBatches: Boolean(prod.trackBatches),
    });
    setViewProductDetails(null);
    try {
      const res = await fetch(`/api/inventory/products/${prod.id}`);
      const data = await res.json();
      if (res.ok && data.usedInServices) {
        setViewProductDetails({ usedInServices: data.usedInServices });
      }
    } catch {
      // ignore detail fetch error
    }
  };

  // Save Product Edit
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewProductTarget) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/inventory/products/${viewProductTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editProductForm.name.trim(),
          categoryId: editProductForm.categoryId || null,
          unit: editProductForm.unit,
          costPrice: editProductForm.costPrice || "0",
          sellingPrice: editProductForm.sellingPrice || "0",
          minStock: editProductForm.lowStockAlert || "0",
          sku: editProductForm.sku.trim() || undefined,
          barcode: editProductForm.barcode.trim() || null,
          brand: editProductForm.brand.trim() || null,
          description: editProductForm.description.trim() || null,
          trackBatches: editProductForm.trackBatches,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update product");
      setViewProductTarget(null);
      setIsEditingProduct(false);
      setBanner({ kind: "success", text: `"${editProductForm.name.trim()}" updated.` });
      await fetchInventoryData();
    } catch (err: any) {
      setBanner({ kind: "error", text: err.message || "Failed to update product" });
    } finally {
      setSubmitting(false);
    }
  };

  const navItems: Array<{
    id: InventorySection;
    label: string;
    href: string;
    badge?: number;
  }> = [
    { id: "products", label: "Products", href: "/admin/inventory" },
    { id: "stock", label: "Stock", href: "/admin/inventory/stock" },
    {
      id: "low-stock",
      label: "Low Stock",
      href: "/admin/inventory/low-stock",
      badge: summaryStats.alertTotal > 0 ? summaryStats.alertTotal : undefined,
    },
    { id: "history", label: "History", href: "/admin/inventory/history" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] flex items-center gap-2.5">
            <Package className="w-7 h-7 text-[#7C3AED]" />
            <span>Inventory</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Manage salon products, add purchased stock, check low stock alerts, and track stock usage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/services"
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-[#E2E8F0] text-[#334155] hover:text-[#6D28D9] hover:border-[#C4B5FD] shadow-xs transition-all flex items-center gap-1.5"
          >
            <Scissors className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>Service Products</span>
          </Link>
          <button
            type="button"
            onClick={openAddProductModal}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-[0_6px_16px_rgba(124,58,237,0.28)] hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {banner && (
        <div
          role={banner.kind === "error" ? "alert" : "status"}
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold ${
            banner.kind === "success"
              ? "bg-[#DCFCE7] border-[#BBF7D0] text-[#15803D]"
              : "bg-[#FEE2E2] border-[#FECACA] text-[#B91C1C]"
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="p-1 rounded-lg hover:bg-black/5"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Cards (Total Products, Low Stock, Out of Stock, Stock Value) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <button
          type="button"
          onClick={() => {
            setStatusFilter("ALL");
            setActiveSection("products");
          }}
          className="text-left p-4 sm:p-5 rounded-2xl bg-white/95 border border-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:border-[#C4B5FD] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B] mb-1.5">
            <span>Total Products</span>
            <Layers className="w-4 h-4 text-[#7C3AED]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
            {summaryStats.totalProducts}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("low-stock")}
          className="text-left p-4 sm:p-5 rounded-2xl bg-white/95 border border-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:border-[#FDE68A] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B] mb-1.5">
            <span>Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#D97706]">
            {summaryStats.lowStockCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("OUT_OF_STOCK");
            setActiveSection("products");
          }}
          className="text-left p-4 sm:p-5 rounded-2xl bg-white/95 border border-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:border-[#FECACA] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B] mb-1.5">
            <span>Out of Stock</span>
            <PackageX className="w-4 h-4 text-[#B91C1C]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#B91C1C]">
            {summaryStats.outOfStockCount}
          </div>
        </button>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/95 border border-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B] mb-1.5">
            <span>Stock Value</span>
            <Wallet className="w-4 h-4 text-[#15803D]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#0F172A] truncate">
            {formatRs(summaryStats.totalStockValue)}
          </div>
        </div>
      </div>

      {/* Simplified 4-Tab Navigation: Products | Stock | Low Stock | History */}
      <div
        role="tablist"
        aria-label="Inventory sections"
        className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3 overflow-x-auto"
      >
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              role="tab"
              aria-selected={isActive}
              onClick={(e) => {
                // Allow instant switching while keeping URL synced
                if (pathname === item.href) {
                  e.preventDefault();
                }
                setActiveSection(item.id);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-[0_4px_12px_rgba(124,58,237,0.25)]"
                  : "bg-white/90 text-[#334155] border border-[#E2E8F0] hover:text-[#6D28D9] hover:bg-white"
              }`}
            >
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-[#FEF3C7] text-[#D97706]"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* ================================================================== */}
      {/* SECTION 1: PRODUCTS                                                */}
      {/* ================================================================== */}
      {activeSection === "products" && (
        <div className="space-y-4">
          {/* Search + Category + Status Filter Bar */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-[#E2E8F0] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by stock status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="ALL">All Status</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-2xl bg-white/95 border border-[#E2E8F0] overflow-hidden shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] bg-[#F8FAFC]">
                    <th className="p-4 font-bold">Product</th>
                    <th className="p-4 font-bold">Category</th>
                    <th className="p-4 font-bold">Stock</th>
                    <th className="p-4 font-bold">Cost</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-[#64748B]">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#7C3AED] mb-2" />
                        Loading products...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-[#64748B]">
                        <p className="font-semibold text-[#0F172A] mb-1">No products found</p>
                        <p className="text-xs">
                          Click &ldquo;+ Add Product&rdquo; above to add your first salon product.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const status = getProductStatus(p);
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-[#F8FAFC] transition-colors"
                        >
                          <td className="p-4">
                            <div className="font-bold text-[#0F172A]">{p.name}</div>
                            {p.brand && (
                              <div className="text-xs text-[#64748B]">{p.brand}</div>
                            )}
                          </td>
                          <td className="p-4 text-[#334155]">
                            {p.category?.name || "Uncategorized"}
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-[#0F172A]">
                              {formatUnitQty(p.onHand, p.unit)}
                            </span>
                          </td>
                          <td className="p-4 font-semibold text-[#334155]">
                            {formatRs(p.costPrice)}
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${status.badgeClass}`}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openAddStock(p)}
                                title="Add Stock"
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0] transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Stock</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openUseStock(p)}
                                title="Use Stock"
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0] transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                                <span>Use Stock</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openViewProduct(p)}
                                title="View Product"
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E2E8F0] text-[#334155] hover:text-[#6D28D9] hover:border-[#C4B5FD] transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile / Tablet Responsive Cards */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {loading ? (
              <div className="p-8 text-center rounded-2xl bg-white border border-[#E2E8F0] text-[#64748B]">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#7C3AED] mb-2" />
                Loading products...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white border border-[#E2E8F0] text-[#64748B]">
                No products found. Tap &ldquo;+ Add Product&rdquo; to add one.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const status = getProductStatus(p);
                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-[#0F172A]">{p.name}</h3>
                        <p className="text-xs text-[#64748B]">
                          {p.category?.name || "Uncategorized"}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${status.badgeClass}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F1F5F9]">
                      <div>
                        <span className="text-[#64748B] block">Current Stock</span>
                        <span className="font-extrabold text-sm text-[#0F172A]">
                          {formatUnitQty(p.onHand, p.unit)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#64748B] block">Cost</span>
                        <span className="font-bold text-sm text-[#334155]">
                          {formatRs(p.costPrice)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openAddStock(p)}
                        className="py-2 px-2.5 rounded-xl text-xs font-bold bg-[#DCFCE7] text-[#15803D] flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Stock</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openUseStock(p)}
                        className="py-2 px-2.5 rounded-xl text-xs font-bold bg-[#F1F5F9] text-[#334155] flex items-center justify-center gap-1"
                      >
                        <Minus className="w-3.5 h-3.5" />
                        <span>Use Stock</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openViewProduct(p)}
                        className="py-2 px-2.5 rounded-xl text-xs font-semibold bg-white border border-[#E2E8F0] text-[#334155] flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SECTION 2: STOCK (Focused Quick Stock Management)                  */}
      {/* ================================================================== */}
      {activeSection === "stock" && (
        <div className="space-y-4">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-[#E2E8F0] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search products to add or use stock..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
            <select
              aria-label="Filter stock by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl bg-white/95 border border-[#E2E8F0] divide-y divide-[#E2E8F0] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            {loading ? (
              <div className="p-10 text-center text-[#64748B]">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#7C3AED] mb-2" />
                Loading stock levels...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-10 text-center text-[#64748B]">
                No products found.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const status = getProductStatus(p);
                return (
                  <div
                    key={p.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-bold text-base text-[#0F172A]">{p.name}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${status.badgeClass}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[#334155]">
                        Current Stock:{" "}
                        <span className="font-extrabold text-[#0F172A]">
                          {formatUnitQty(p.onHand, p.unit)}
                        </span>
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {p.category?.name || "Uncategorized"} &bull; Low Stock Alert:{" "}
                        {formatUnitQty(p.minStock, p.unit)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openAddStock(p)}
                        className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#15803D] text-white hover:bg-[#166534] shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Add Stock</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openUseStock(p)}
                        className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] hover:bg-[#E2E8F0] transition-all inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                        <span>- Use Stock</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SECTION 3: LOW STOCK                                               */}
      {/* ================================================================== */}
      {activeSection === "low-stock" && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/95 border border-[#E2E8F0] overflow-hidden shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            {loading ? (
              <div className="p-10 text-center text-[#64748B]">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#7C3AED] mb-2" />
                Checking low stock items...
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-[#15803D] mx-auto" />
                <h3 className="text-base font-bold text-[#0F172A]">
                  All Products Have Enough Stock
                </h3>
                <p className="text-xs text-[#64748B]">
                  No products are currently at or below their minimum stock alert level.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[#64748B] bg-[#F8FAFC]">
                      <th className="p-4 font-bold">Product</th>
                      <th className="p-4 font-bold">Current</th>
                      <th className="p-4 font-bold">Minimum</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {lowStockItems.map((item) => {
                      const isCritical =
                        item.severity === "CRITICAL" || Number(item.quantity) <= 0;
                      const matchingProduct = products.find(
                        (p) => p.id === item.productId
                      ) || {
                        id: item.productId,
                        name: item.productName,
                        sku: item.sku,
                        unit: item.unit,
                        costPrice: item.costPrice || "0",
                        sellingPrice: "0",
                        minStock: item.minStock,
                        onHand: item.quantity,
                        isLow: true,
                        isActive: true,
                      };

                      return (
                        <tr
                          key={item.productId}
                          className="hover:bg-[#F8FAFC] transition-colors"
                        >
                          <td className="p-4">
                            <div className="font-bold text-[#0F172A]">
                              {item.productName}
                            </div>
                            {item.categoryName && (
                              <div className="text-xs text-[#64748B]">
                                {item.categoryName}
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-extrabold text-[#0F172A]">
                            {formatUnitQty(item.quantity, item.unit)}
                          </td>
                          <td className="p-4 font-semibold text-[#64748B]">
                            {formatUnitQty(item.minStock, item.unit)}
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                                isCritical
                                  ? "bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]"
                                  : "bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]"
                              }`}
                            >
                              {isCritical ? "Critical" : "Low Stock"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => openAddStock(matchingProduct)}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#15803D] text-white hover:bg-[#166534] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Add Stock</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SECTION 4: STOCK HISTORY                                           */}
      {/* ================================================================== */}
      {activeSection === "history" && (
        <div className="space-y-4">
          {/* History Filters: Product | Date | Reason */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] mb-1">
                Product
              </label>
              <select
                value={historyProductFilter}
                onChange={(e) => setHistoryProductFilter(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="ALL">All Products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#64748B] mb-1">
                Date
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                />
                {historyDateFilter && (
                  <button
                    type="button"
                    onClick={() => setHistoryDateFilter("")}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#64748B] mb-1">
                Reason
              </label>
              <select
                value={historyReasonFilter}
                onChange={(e) => setHistoryReasonFilter(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
              >
                {HISTORY_REASON_FILTERS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Simple History Table */}
          <div className="rounded-2xl bg-white/95 border border-[#E2E8F0] overflow-hidden shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] bg-[#F8FAFC]">
                    <th className="p-4 font-bold">Date</th>
                    <th className="p-4 font-bold">Product</th>
                    <th className="p-4 font-bold">Change</th>
                    <th className="p-4 font-bold">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-[#64748B]">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#7C3AED] mb-2" />
                        Loading stock history...
                      </td>
                    </tr>
                  ) : movements.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-[#64748B]">
                        No stock history found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => {
                      const numQty = Number(m.quantity ?? 0);
                      const isPositive = numQty > 0;
                      const reasonLabel = m.displayReason || m.reason || "Stock update";
                      return (
                        <tr
                          key={m.id}
                          className="hover:bg-[#F8FAFC] transition-colors"
                        >
                          <td className="p-4 text-[#475569] font-medium whitespace-nowrap">
                            {formatShortDate(m.createdAt)}
                          </td>
                          <td className="p-4 font-bold text-[#0F172A]">
                            {m.product?.name || "Product"}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span
                              className={`font-extrabold ${
                                isPositive ? "text-[#15803D]" : "text-[#B91C1C]"
                              }`}
                            >
                              {formatChangeQty(m.quantity, m.product?.unit)}
                            </span>
                          </td>
                          <td className="p-4 text-[#334155] font-medium">
                            {reasonLabel}
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

      {/* ================================================================== */}
      {/* MODAL 1: ADD PRODUCT                                               */}
      {/* ================================================================== */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E2E8F0] p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h2 className="font-extrabold text-base sm:text-lg text-[#0F172A] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#7C3AED]" />
                <span>Add Product</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs sm:text-sm">
              {/* Product Name */}
              <div>
                <label className="block text-[#334155] font-bold mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. L'Oreal Shampoo"
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm({ ...productForm, name: e.target.value })
                  }
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#334155] font-bold">Category</label>
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryInput((v) => !v)}
                      className="text-[11px] font-bold text-[#6D28D9] hover:underline"
                    >
                      {showNewCategoryInput ? "Select existing" : "+ New"}
                    </button>
                  </div>
                  {showNewCategoryInput ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Category name..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A]"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategoryInline}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-[#7C3AED] text-white"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <select
                      value={productForm.categoryId}
                      onChange={(e) =>
                        setProductForm({ ...productForm, categoryId: e.target.value })
                      }
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[#334155] font-bold mb-1">
                    Unit
                  </label>
                  <select
                    value={productForm.unit}
                    onChange={(e) =>
                      setProductForm({ ...productForm, unit: e.target.value })
                    }
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cost Price & Selling Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[#334155] font-bold mb-1">
                    Cost Price (Rs.) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="3500"
                    value={productForm.costPrice}
                    onChange={(e) =>
                      setProductForm({ ...productForm, costPrice: e.target.value })
                    }
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div>
                  <label className="block text-[#334155] font-bold mb-1">
                    Selling Price (Rs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="4500"
                    value={productForm.sellingPrice}
                    onChange={(e) =>
                      setProductForm({ ...productForm, sellingPrice: e.target.value })
                    }
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              {/* Current Stock & Low Stock Alert */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[#334155] font-bold mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="10"
                    value={productForm.currentStock}
                    onChange={(e) =>
                      setProductForm({ ...productForm, currentStock: e.target.value })
                    }
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div>
                  <label className="block text-[#334155] font-bold mb-1">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="3"
                    value={productForm.lowStockAlert}
                    onChange={(e) =>
                      setProductForm({ ...productForm, lowStockAlert: e.target.value })
                    }
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              {/* Advanced Options Toggle */}
              <div className="pt-1 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowAdvancedProductOptions((v) => !v)}
                  className="w-full flex items-center justify-between py-2 text-xs font-bold text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                >
                  <span>Advanced Options (SKU, Barcode, Brand, Batch/Expiry)</span>
                  {showAdvancedProductOptions ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showAdvancedProductOptions && (
                  <div className="space-y-3 pt-2 pb-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[#64748B] font-semibold mb-1">
                          Brand (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. L'Oreal"
                          value={productForm.brand}
                          onChange={(e) =>
                            setProductForm({ ...productForm, brand: e.target.value })
                          }
                          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#64748B] font-semibold mb-1">
                          SKU (Auto-generated if empty)
                        </label>
                        <input
                          type="text"
                          placeholder="Optional SKU"
                          value={productForm.sku}
                          onChange={(e) =>
                            setProductForm({ ...productForm, sku: e.target.value })
                          }
                          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[#64748B] font-semibold mb-1">
                        Barcode (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Scan or type barcode"
                        value={productForm.barcode}
                        onChange={(e) =>
                          setProductForm({ ...productForm, barcode: e.target.value })
                        }
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#64748B] font-semibold mb-1">
                        Description (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Notes about this product..."
                        value={productForm.description}
                        onChange={(e) =>
                          setProductForm({ ...productForm, description: e.target.value })
                        }
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] resize-none"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-[#334155] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={productForm.trackBatches}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            trackBatches: e.target.checked,
                          })
                        }
                        className="rounded accent-[#7C3AED]"
                      />
                      <span>Enable batch &amp; expiry date tracking for this product</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#F8FAFC] text-[#334155] hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Adding..." : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 2: + ADD STOCK                                               */}
      {/* ================================================================== */}
      {addStockTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E2E8F0] p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-extrabold text-base sm:text-lg text-[#0F172A] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#15803D]" />
                <span>Add Stock</span>
              </h3>
              <button
                type="button"
                onClick={() => setAddStockTarget(null)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStockSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B] block">Product</span>
                <span className="font-extrabold text-base text-[#0F172A]">
                  {addStockTarget.name}
                </span>
                <span className="text-xs text-[#475569] block mt-0.5">
                  Current Stock: <b>{formatUnitQty(addStockTarget.onHand, addStockTarget.unit)}</b>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[#334155] font-bold mb-1">
                    Quantity ({addStockTarget.unit}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    required
                    value={addStockForm.quantity}
                    onChange={(e) =>
                      setAddStockForm({ ...addStockForm, quantity: e.target.value })
                    }
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div>
                  <label className="block text-[#334155] font-bold mb-1">
                    Cost per Unit (Rs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="3200"
                    value={addStockForm.unitCost}
                    onChange={(e) =>
                      setAddStockForm({ ...addStockForm, unitCost: e.target.value })
                    }
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#334155] font-bold mb-1">
                  Reason
                </label>
                <select
                  value={addStockForm.reason}
                  onChange={(e) =>
                    setAddStockForm({ ...addStockForm, reason: e.target.value })
                  }
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                >
                  {ADD_STOCK_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {addStockForm.reason === "Other" && (
                <div>
                  <label className="block text-[#334155] font-bold mb-1">
                    Note
                  </label>
                  <input
                    type="text"
                    placeholder="Enter reason..."
                    value={addStockForm.customReason}
                    onChange={(e) =>
                      setAddStockForm({ ...addStockForm, customReason: e.target.value })
                    }
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-[#0F172A]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[#334155] font-bold mb-1">
                  Supplier <span className="font-normal text-[#64748B]">(Optional)</span>
                </label>
                {suppliers.length > 0 ? (
                  <select
                    value={addStockForm.supplierId}
                    onChange={(e) =>
                      setAddStockForm({ ...addStockForm, supplierId: e.target.value })
                    }
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                  >
                    <option value="">Optional</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Optional supplier name"
                    value={addStockForm.supplierName}
                    onChange={(e) =>
                      setAddStockForm({ ...addStockForm, supplierName: e.target.value })
                    }
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                  />
                )}
              </div>

              {/* Batch / Expiry only if product uses it or user expands Advanced */}
              {(addStockTarget.trackBatches || showAddStockBatchOptions) ? (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#F1F5F9]">
                  <div>
                    <label className="block text-xs text-[#64748B] font-semibold mb-1">
                      Batch Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={addStockForm.batchNumber}
                      onChange={(e) =>
                        setAddStockForm({ ...addStockForm, batchNumber: e.target.value })
                      }
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#64748B] font-semibold mb-1">
                      Expiry Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={addStockForm.expiryDate}
                      onChange={(e) =>
                        setAddStockForm({ ...addStockForm, expiryDate: e.target.value })
                      }
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A]"
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddStockBatchOptions(true)}
                  className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A]"
                >
                  + Advanced Options (Batch / Expiry Date)
                </button>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setAddStockTarget(null)}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#F8FAFC] text-[#334155]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#15803D] text-white hover:bg-[#166534] shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : "Add Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 3: - USE STOCK                                               */}
      {/* ================================================================== */}
      {useStockTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E2E8F0] p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-extrabold text-base sm:text-lg text-[#0F172A] flex items-center gap-2">
                <Minus className="w-5 h-5 text-[#6D28D9]" />
                <span>Use Stock</span>
              </h3>
              <button
                type="button"
                onClick={() => setUseStockTarget(null)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUseStockSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B] block">Product</span>
                <span className="font-extrabold text-base text-[#0F172A]">
                  {useStockTarget.name}
                </span>
                <span className="text-xs text-[#475569] block mt-0.5">
                  Current Stock: <b>{formatUnitQty(useStockTarget.onHand, useStockTarget.unit)}</b>
                </span>
              </div>

              <div>
                <label className="block text-[#334155] font-bold mb-1">
                  Quantity ({useStockTarget.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  value={useStockForm.quantity}
                  onChange={(e) =>
                    setUseStockForm({ ...useStockForm, quantity: e.target.value })
                  }
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-[#334155] font-bold mb-1">
                  Reason
                </label>
                <select
                  value={useStockForm.reason}
                  onChange={(e) =>
                    setUseStockForm({ ...useStockForm, reason: e.target.value })
                  }
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                >
                  {USE_STOCK_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {useStockForm.reason === "Other" && (
                <div>
                  <label className="block text-[#334155] font-bold mb-1">
                    Note *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter reason..."
                    value={useStockForm.customReason}
                    onChange={(e) =>
                      setUseStockForm({ ...useStockForm, customReason: e.target.value })
                    }
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-[#0F172A]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setUseStockTarget(null)}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#F8FAFC] text-[#334155]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 4: VIEW / EDIT PRODUCT DETAILS                               */}
      {/* ================================================================== */}
      {viewProductTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E2E8F0] p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-extrabold text-base sm:text-lg text-[#0F172A] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#7C3AED]" />
                <span>{isEditingProduct ? "Edit Product" : viewProductTarget.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setViewProductTarget(null);
                  setIsEditingProduct(false);
                }}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isEditingProduct ? (
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-xs text-[#64748B] block">Current Stock</span>
                    <span className="text-lg font-extrabold text-[#0F172A]">
                      {formatUnitQty(viewProductTarget.onHand, viewProductTarget.unit)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-xs text-[#64748B] block">Low Stock Alert</span>
                    <span className="text-lg font-bold text-[#334155]">
                      {formatUnitQty(viewProductTarget.minStock, viewProductTarget.unit)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-xs text-[#64748B] block">Cost Price</span>
                    <span className="text-base font-bold text-[#0F172A]">
                      {formatRs(viewProductTarget.costPrice)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-xs text-[#64748B] block">Selling Price</span>
                    <span className="text-base font-bold text-[#0F172A]">
                      {formatRs(viewProductTarget.sellingPrice)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-[#475569]">
                  <div>
                    Category:{" "}
                    <b className="text-[#0F172A]">
                      {viewProductTarget.category?.name || "Uncategorized"}
                    </b>
                  </div>
                  {viewProductTarget.brand && (
                    <div>
                      Brand: <b className="text-[#0F172A]">{viewProductTarget.brand}</b>
                    </div>
                  )}
                  {viewProductTarget.description && (
                    <div>
                      Description:{" "}
                      <span className="text-[#0F172A]">{viewProductTarget.description}</span>
                    </div>
                  )}
                </div>

                {/* Services that use this product */}
                {viewProductDetails && viewProductDetails.usedInServices.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] space-y-2">
                    <span className="text-xs font-bold text-[#6D28D9] flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5" />
                      <span>Used in Services (Auto-Deducted on Completion)</span>
                    </span>
                    <div className="divide-y divide-[#DDD6FE]/60">
                      {viewProductDetails.usedInServices.map((u) => (
                        <div
                          key={u.serviceId}
                          className="py-1.5 flex items-center justify-between text-xs"
                        >
                          <span className="font-semibold text-[#0F172A]">
                            {u.serviceName}
                          </span>
                          <span className="font-bold text-[#6D28D9]">
                            {formatUnitQty(u.quantity, viewProductTarget.unit)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewProductTarget;
                        setViewProductTarget(null);
                        openAddStock(target);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#15803D] text-white inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Stock</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewProductTarget;
                        setViewProductTarget(null);
                        openUseStock(target);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#F1F5F9] text-[#0F172A] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>- Use Stock</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingProduct(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-[#E2E8F0] text-[#334155] hover:text-[#6D28D9] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Product</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProduct} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-[#334155] font-bold mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editProductForm.name}
                    onChange={(e) =>
                      setEditProductForm({ ...editProductForm, name: e.target.value })
                    }
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[#334155] font-bold mb-1">Category</label>
                    <select
                      value={editProductForm.categoryId}
                      onChange={(e) =>
                        setEditProductForm({ ...editProductForm, categoryId: e.target.value })
                      }
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A]"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#334155] font-bold mb-1">Unit</label>
                    <select
                      value={editProductForm.unit}
                      onChange={(e) =>
                        setEditProductForm({ ...editProductForm, unit: e.target.value })
                      }
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#0F172A]"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Cost Price (Rs.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editProductForm.costPrice}
                      onChange={(e) =>
                        setEditProductForm({ ...editProductForm, costPrice: e.target.value })
                      }
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Selling Price (Rs.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editProductForm.sellingPrice}
                      onChange={(e) =>
                        setEditProductForm({
                          ...editProductForm,
                          sellingPrice: e.target.value,
                        })
                      }
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Low Stock Alert
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editProductForm.lowStockAlert}
                      onChange={(e) =>
                        setEditProductForm({
                          ...editProductForm,
                          lowStockAlert: e.target.value,
                        })
                      }
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#0F172A]"
                    />
                  </div>
                </div>

                <div className="pt-1 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={() => setShowEditAdvanced((v) => !v)}
                    className="w-full flex items-center justify-between py-1.5 text-xs font-bold text-[#64748B]"
                  >
                    <span>Advanced Options</span>
                    {showEditAdvanced ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {showEditAdvanced && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-[#64748B] mb-1">Brand</label>
                          <input
                            type="text"
                            value={editProductForm.brand}
                            onChange={(e) =>
                              setEditProductForm({ ...editProductForm, brand: e.target.value })
                            }
                            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#64748B] mb-1">Barcode</label>
                          <input
                            type="text"
                            value={editProductForm.barcode}
                            onChange={(e) =>
                              setEditProductForm({
                                ...editProductForm,
                                barcode: e.target.value,
                              })
                            }
                            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-[#64748B] mb-1">Description</label>
                        <textarea
                          rows={2}
                          value={editProductForm.description}
                          onChange={(e) =>
                            setEditProductForm({
                              ...editProductForm,
                              description: e.target.value,
                            })
                          }
                          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setIsEditingProduct(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] text-[#334155]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white"
                  >
                    {submitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

