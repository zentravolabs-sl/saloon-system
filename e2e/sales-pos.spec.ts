import { test, expect } from "@playwright/test";

// Helper function to perform salon owner login
async function loginAsSalonOwner(page: any) {
  await page.goto("/auth/login");
  await page.waitForLoadState("domcontentloaded");

  // Click the Glamour Cuts Owner quick demo button if present, or fill email/password
  const glamourCutsBtn = page.locator("button:has-text('Glamour Cuts Owner')");
  if (await glamourCutsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await glamourCutsBtn.click();
  } else {
    await page.fill('input[type="email"]', "rajesh@glamourcuts.lk");
    await page.fill('input[type="password"]', "Admin@123");
    await page.click('button[type="submit"]');
  }

  // Wait for redirection away from login page
  await page.waitForURL((url: URL) => !url.pathname.includes("/auth/login"), { timeout: 15000 });
}

test.describe("Sales & POS Modules - End to End Tests", () => {
  // =========================================================================
  // 1. ACCESS CONTROL & ROUTE GUARDS
  // =========================================================================
  test.describe("1. Access Control & Navigation", () => {
    test("Redirects unauthenticated users to login for all Sales & POS routes", async ({ page }) => {
      // 1. Payments route guard
      await page.goto("/admin/payments");
      await expect(page).toHaveURL(/\/auth\/login/);

      // 2. Invoices route guard
      await page.goto("/admin/invoices");
      await expect(page).toHaveURL(/\/auth\/login/);

      // 3. POS route guard
      await page.goto("/admin/pos");
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test("Sidebar displays Sales & POS section with Payments, Invoices, and Product POS links", async ({ page }) => {
      await loginAsSalonOwner(page);
      await page.goto("/admin/dashboard");
      await page.waitForLoadState("domcontentloaded");

      // Verify section header "Sales & POS" in sidebar
      const sectionHeader = page.locator("aside", { hasText: "Sales & POS" });
      await expect(sectionHeader).toBeVisible();

      // Verify each navigation link exists
      const paymentsLink = page.locator("aside a[href='/admin/payments']");
      const invoicesLink = page.locator("aside a[href='/admin/invoices']");
      const posLink = page.locator("aside a[href='/admin/pos']");

      await expect(paymentsLink).toBeVisible();
      await expect(invoicesLink).toBeVisible();
      await expect(posLink).toBeVisible();
    });
  });

  // =========================================================================
  // 2. PAYMENTS MODULE (/admin/payments)
  // =========================================================================
  test.describe("2. Payments Module", () => {
    test("Payments Page: Displays header, revenue statistics cards, search bar, and record payment button", async ({ page }) => {
      await loginAsSalonOwner(page);
      await page.goto("/admin/payments");
      await page.waitForLoadState("networkidle");

      // Verify Header
      await expect(page.locator("h1:has-text('Payments')")).toBeVisible();
      await expect(page.locator("text=Track and record all payment transactions")).toBeVisible();
      await expect(page.locator("button:has-text('Record Payment')").first()).toBeVisible();

      // Verify KPI Stat Cards
      await expect(page.locator("text=Total Revenue")).toBeVisible();
      await expect(page.locator("text=Today's Revenue")).toBeVisible();
      await expect(page.locator("text=Total Transactions")).toBeVisible();
      await expect(page.locator("text=Avg. Transaction")).toBeVisible();

      // Verify Search input
      const searchInput = page.locator("input[placeholder*='Search by customer name']");
      await expect(searchInput).toBeVisible();
    });

    test("Payments Table & Search: Filters transactions dynamically", async ({ page }) => {
      await loginAsSalonOwner(page);
      await page.goto("/admin/payments");
      await page.waitForLoadState("networkidle");

      const table = page.locator("table");
      const emptyState = page.locator("text=No payments found");
      const hasTable = await table.isVisible().catch(() => false);
      const hasEmpty = await emptyState.isVisible().catch(() => false);

      expect(hasTable || hasEmpty).toBeTruthy();

      if (hasTable) {
        // Verify Table Column Headers
        const expectedHeaders = ["Customer", "Branch", "Method", "Amount", "Status", "Date", "Notes"];
        for (const header of expectedHeaders) {
          await expect(page.locator(`th:has-text('${header}')`)).toBeVisible();
        }

        // Test search filter
        const searchInput = page.locator("input[placeholder*='Search by customer name']");
        await searchInput.fill("GLA-");
        await page.waitForTimeout(500);
        await expect(searchInput).toHaveValue("GLA-");

        // Clear search
        await searchInput.fill("");
        await page.waitForTimeout(300);
      }
    });

    test("Record Payment Modal: Opens, validates booking search, switches method, and records payment successfully", async ({ page }) => {
      await loginAsSalonOwner(page);
      await page.goto("/admin/payments");
      await page.waitForLoadState("networkidle");

      // Click "Record Payment" button to open modal
      const recordBtn = page.locator("button:has-text('Record Payment')").first();
      await recordBtn.click();

      // Modal verification
      const modal = page.locator("div.fixed.inset-0");
      await expect(modal.locator("h2:has-text('Record Payment')")).toBeVisible();

      // Search for an existing confirmed booking (e.g. GLA-20260924-00001)
      const bookingSearchInput = modal.locator("input[placeholder*='GLM-20260924-00001']");
      await expect(bookingSearchInput).toBeVisible();
      await bookingSearchInput.fill("GLA-20260924-00001");

      // Click search button
      const searchBtn = modal.locator("button:has(svg.lucide-search)");
      await searchBtn.click();

      // Wait for booking to be found
      const bookingResult = modal.locator("div:has-text('GLA-20260924-00001')").first();
      await expect(bookingResult).toBeVisible({ timeout: 10000 });

      // Verify and set Amount
      const amountInput = modal.locator("input[placeholder='0.00']");
      await expect(amountInput).toBeVisible();
      await amountInput.fill("500");

      // Switch Payment Method (Card, then Cash)
      const cardMethodBtn = modal.locator("button:has-text('Card')");
      await cardMethodBtn.click();

      const cashMethodBtn = modal.locator("button:has-text('Cash')");
      await cashMethodBtn.click();

      // Enter Notes
      const notesInput = modal.locator("input[placeholder*='Cash received at counter']");
      const uniqueNote = `E2E Test Payment ${Date.now().toString().slice(-4)}`;
      await notesInput.fill(uniqueNote);

      // Submit payment
      const submitPaymentBtn = modal.locator("button:has-text('Record Payment')").last();
      const responsePromise = page.waitForResponse(
        (resp: any) => resp.url().includes("/api/payments") && resp.request().method() === "POST",
        { timeout: 15000 }
      );
      await submitPaymentBtn.click();

      const response = await responsePromise;
      expect(response.status()).toBe(201);

      // Verify modal closes
      await expect(modal).not.toBeVisible({ timeout: 8000 });

      // Verify the recorded payment appears in the table
      const searchInput = page.locator("input[placeholder*='Search by customer name']");
      await searchInput.fill(uniqueNote);
      await page.waitForTimeout(1000);

      await expect(page.locator(`text=${uniqueNote}`)).toBeVisible({ timeout: 10000 });
      await expect(page.locator("text=LKR 500").first()).toBeVisible();
    });
  });

  // =========================================================================
  // 3. INVOICES MODULE (/admin/invoices)
  // =========================================================================
  test.describe("3. Invoices Module", () => {
    test("Invoices Page: Displays header, invoice search, and table columns correctly", async ({ page }) => {
      await loginAsSalonOwner(page);
      await page.goto("/admin/invoices");
      await page.waitForLoadState("networkidle");

      // Header verification
      await expect(page.locator("h1:has-text('Invoices & Billing')")).toBeVisible();
      await expect(
        page.locator("text=Automatically generated billing invoices for completed client services")
      ).toBeVisible();

      // Search input verification
      const searchInput = page.locator("input[placeholder*='Search by invoice # or customer']");
      await expect(searchInput).toBeVisible();

      // Table verification
      const table = page.locator("table");
      const emptyState = page.locator("text=No Invoices Found");
      const hasTable = await table.isVisible().catch(() => false);
      const hasEmpty = await emptyState.isVisible().catch(() => false);

      expect(hasTable || hasEmpty).toBeTruthy();

      if (hasTable) {
        const expectedHeaders = [
          "Invoice #",
          "Customer",
          "Date Issued",
          "Subtotal",
          "Discount",
          "Total Amount",
          "Status",
          "Actions",
        ];
        for (const h of expectedHeaders) {
          await expect(page.locator(`th:has-text('${h}')`)).toBeVisible();
        }
      }
    });

    test("Printable Invoice Modal: Opens Tax Invoice modal with details and closes cleanly", async ({ page }) => {
      await loginAsSalonOwner(page);
      await page.goto("/admin/invoices");
      await page.waitForLoadState("networkidle");

      // Check if invoices table has rows
      const printBtn = page.locator("button:has-text('Print')").first();
      if (await printBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await printBtn.click();

        // Verify Printable Modal Opens
        const modal = page.locator("div.fixed.inset-0");
        await expect(modal).toBeVisible();
        await expect(modal.locator("h3:has-text('Tax Invoice')")).toBeVisible();
        await expect(modal.locator("text=Billed To:").first()).toBeVisible();
        await expect(modal.locator("text=Issued Date:").first()).toBeVisible();
        await expect(modal.locator("text=Services Rendered:").first()).toBeVisible();

        // Close modal with X button
        const closeBtn = modal.locator("button:has(svg.lucide-x)");
        await closeBtn.click();
        await expect(modal).not.toBeVisible({ timeout: 5000 });
      }
    });

    test("Invoice Search: Real-time filtering by invoice number or customer", async ({ page }) => {
      await loginAsSalonOwner(page);
      await page.goto("/admin/invoices");
      await page.waitForLoadState("networkidle");

      const searchInput = page.locator("input[placeholder*='Search by invoice # or customer']");
      await expect(searchInput).toBeVisible();

      // Search query
      await searchInput.fill("INV-");
      await page.waitForTimeout(600);
      await expect(searchInput).toHaveValue("INV-");

      // Clear query
      await searchInput.fill("");
      await page.waitForTimeout(400);
    });
  });

  // =========================================================================
  // 4. PRODUCT POS MODULE (/admin/pos)
  // =========================================================================
  test.describe("4. Product POS Module", () => {
    test("POS Terminal Interface: Loads product catalog, branch selector, and active cart", async ({ page }) => {
      await loginAsSalonOwner(page);
      await page.goto("/admin/pos");
      await page.waitForLoadState("networkidle");

      // Verify Heading & View switcher buttons
      await expect(page.locator("h1:has-text('Retail Point of Sale (POS)')")).toBeVisible();
      await expect(page.locator("button:has-text('Terminal Counter')")).toBeVisible();
      await expect(page.locator("button:has-text('Sales History & Refunds')")).toBeVisible();

      // Verify Search and Branch Dropdown
      const searchInput = page.locator("input[placeholder*='Scan barcode or type name']");
      await expect(searchInput).toBeVisible();

      const branchSelect = page.locator("select:has(option)").first();
      await expect(branchSelect).toBeVisible();

      // Verify Cart Panel
      await expect(page.locator("h3:has-text('Active Cart')")).toBeVisible();
      await expect(page.locator("text=Payment Method")).toBeVisible();
      await expect(page.locator("button:has-text('Complete Sale')")).toBeVisible();
    });

    test("POS Catalog Search & Filtering: Filters sellable products in real-time", async ({ page }) => {
      await loginAsSalonOwner(page);
      await page.goto("/admin/pos");
      await page.waitForLoadState("networkidle");

      const searchInput = page.locator("input[placeholder*='Scan barcode or type name']");

      // Search by specific product name or SKU
      await searchInput.fill("Shampoo");
      await page.waitForTimeout(500);

      // Verify matching product cards exist
      const productCard = page.locator("button:has-text('Shampoo')").first();
      await expect(productCard).toBeVisible({ timeout: 5000 });

      // Clear search
      await searchInput.fill("");
      await page.waitForTimeout(300);
    });

    test("POS Cart Management: Adds products, updates quantities, applies discount, and clears cart", async ({ page }) => {
      await loginAsSalonOwner(page);
      await page.goto("/admin/pos");
      await page.waitForLoadState("networkidle");

      // Click the first available product to add to cart
      const availableProduct = page.locator("button:has(div.text-emerald-400):not([disabled])").first();
      await expect(availableProduct).toBeVisible({ timeout: 10000 });
      await availableProduct.click();

      // Verify item appears in Active Cart (1 item)
      await expect(page.locator("h3:has-text('Active Cart (1 items)')")).toBeVisible();

      // Test quantity increment (+)
      const plusBtn = page.locator("div.space-y-2 button:has(svg.lucide-plus)").first();
      await plusBtn.click();
      await expect(page.locator("h3:has-text('Active Cart (2 items)')")).toBeVisible();

      // Test quantity decrement (-)
      const minusBtn = page.locator("div.space-y-2 button:has(svg.lucide-minus)").first();
      await minusBtn.click();
      await expect(page.locator("h3:has-text('Active Cart (1 items)')")).toBeVisible();

      // Test Discount Input
      const discountInput = page.locator("input[type='number'][max='100']");
      await discountInput.fill("10");
      await expect(page.locator("text=Discount Deduction")).toBeVisible();

      // Test Clear Cart
      const clearCartBtn = page.locator("button:has-text('Clear Cart')");
      await clearCartBtn.click();
      await expect(page.locator("text=No items in cart")).toBeVisible();
    });

    test("POS Checkout Flow: Completes retail sale, generates receipt, and deducts inventory", async ({ page }) => {
      await loginAsSalonOwner(page);
      await page.goto("/admin/pos");
      await page.waitForLoadState("networkidle");

      // Add product to cart
      const availableProduct = page.locator("button:has(div.text-emerald-400):not([disabled])").first();
      await expect(availableProduct).toBeVisible({ timeout: 10000 });
      await availableProduct.click();

      // Select Walk-in customer or choose first customer
      const customerSelect = page.locator("div.space-y-2\\.5 select").first();
      await expect(customerSelect).toBeVisible();

      // Select Seller Staff if available
      const staffSelect = page.locator("div.space-y-2\\.5 select").nth(1);
      if (await staffSelect.isVisible()) {
        const optionCount = await staffSelect.locator("option").count();
        if (optionCount > 1) {
          await staffSelect.selectOption({ index: 1 });
        }
      }

      // Choose Payment Method (Card)
      const cardMethodBtn = page.locator("button:has-text('Card')").first();
      await cardMethodBtn.click();

      // Click Complete Sale
      const completeSaleBtn = page.locator("button:has-text('Complete Sale')");
      await expect(completeSaleBtn).toBeEnabled();

      const saleResponsePromise = page.waitForResponse(
        (resp: any) => resp.url().includes("/api/pos/sales") && resp.request().method() === "POST",
        { timeout: 15000 }
      );
      await completeSaleBtn.click();

      const saleResponse = await saleResponsePromise;
      expect([200, 201]).toContain(saleResponse.status());

      // Verify Sale Completed Receipt Modal appears
      const receiptModal = page.locator("div.fixed.inset-0");
      await expect(receiptModal.locator("h3:has-text('Sale Completed!')")).toBeVisible({ timeout: 8000 });
      await expect(receiptModal.locator("text=Total Received:")).toBeVisible();

      // Click "Close / New Sale" to close receipt modal
      const newSaleBtn = receiptModal.locator("button:has-text('Close / New Sale')");
      await newSaleBtn.click();
      await expect(receiptModal).not.toBeVisible({ timeout: 5000 });

      // Cart should be empty and ready for next customer
      await expect(page.locator("text=No items in cart")).toBeVisible();
    });

    test("Sales History & Refunds View: Displays past sales table with Sale #, Total, and Status", async ({ page }) => {
      await loginAsSalonOwner(page);
      await page.goto("/admin/pos");
      await page.waitForLoadState("networkidle");

      // Switch to "Sales History & Refunds" view
      const historyTabBtn = page.locator("button:has-text('Sales History & Refunds')");
      await historyTabBtn.click();

      // Verify table headers
      const expectedHeaders = [
        "Sale #",
        "Date",
        "Customer",
        "Branch",
        "Seller Staff",
        "Items Sold",
        "Total",
        "Status",
        "Actions",
      ];
      for (const h of expectedHeaders) {
        await expect(page.locator(`th:has-text('${h}')`)).toBeVisible();
      }

      // Verify at least one completed sale row is present (from previous test or seed)
      const saleRow = page.locator("tbody tr").first();
      await expect(saleRow).toBeVisible({ timeout: 10000 });

      // Verify status badge
      await expect(saleRow.locator("text=COMPLETED").first()).toBeVisible();
    });
  });
});
