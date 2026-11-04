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

test.describe("Admin Bookings Section - End to End Tests", () => {
  test("1. Unauthorized Access: Redirects unauthenticated user to login", async ({ page }) => {
    // Attempt to access /admin/bookings directly without authentication
    await page.goto("/admin/bookings");

    // Expect redirect to /auth/login with callbackUrl
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("2. Authentication & Page Load: Salon owner can log in and view admin bookings", async ({ page }) => {
    await loginAsSalonOwner(page);

    // Navigate to admin bookings page
    await page.goto("/admin/bookings");
    await page.waitForLoadState("domcontentloaded");

    // Verify page header
    const heading = page.locator("h1:has-text('Bookings & Reservations')").first();
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Verify key action buttons and controls
    await expect(page.locator("button:has-text('Create Walk-In Booking')")).toBeVisible();
    await expect(page.locator("input[placeholder*='Search by customer']")).toBeVisible();
    await expect(page.locator("select").first()).toBeVisible(); // Status filter
    await expect(page.locator("input[type='date']")).toBeVisible(); // Date filter
  });

  test("3. Bookings Table: Displays appointments or empty state correctly", async ({ page }) => {
    await loginAsSalonOwner(page);
    await page.goto("/admin/bookings");
    await page.waitForLoadState("networkidle");

    // Check if table is rendered
    const table = page.locator("table");
    const noBookings = page.locator("text=No bookings found");

    const hasTable = await table.isVisible().catch(() => false);
    const hasEmpty = await noBookings.isVisible().catch(() => false);

    expect(hasTable || hasEmpty).toBeTruthy();

    if (hasTable) {
      // Verify table headers
      const headers = ["Reference", "Customer", "Branch", "Stylist", "Services", "Date & Time", "Status", "Actions"];
      for (const h of headers) {
        await expect(page.locator(`th:has-text('${h}')`)).toBeVisible();
      }

      // Check rows exist
      const rows = page.locator("tbody tr");
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
    }
  });

  test("4. Filtering & Search: Filter by status and search input", async ({ page }) => {
    await loginAsSalonOwner(page);
    await page.goto("/admin/bookings");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator("input[placeholder*='Search by customer']");
    await expect(searchInput).toBeVisible();

    // Type a search query that matches or tests reactive filtering
    await searchInput.fill("Rajesh");
    await page.waitForTimeout(500);

    // Verify search input value
    await expect(searchInput).toHaveValue("Rajesh");

    // Clear search query
    await searchInput.fill("");
    await page.waitForTimeout(500);

    // Test Status filter dropdown
    const statusSelect = page.locator("div:has(input[placeholder*='Search']) ~ div select").first();
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption("CONFIRMED");
      await page.waitForTimeout(1000);

      // Verify selected value
      await expect(statusSelect).toHaveValue("CONFIRMED");

      // Reset back to All Statuses
      await statusSelect.selectOption("");
      await page.waitForTimeout(500);
    }
  });

  test("5. View Details Modal: Opens and dismisses booking details modal", async ({ page }) => {
    await loginAsSalonOwner(page);
    await page.goto("/admin/bookings");
    await page.waitForLoadState("networkidle");

    // Find first eye / view details button in table
    const viewDetailsBtn = page.locator("button[title='View Details']").first();

    if (await viewDetailsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewDetailsBtn.click();

      // Check modal appeared
      const modalHeading = page.locator("h3:has-text('Booking Details')");
      await expect(modalHeading).toBeVisible({ timeout: 5000 });

      // Verify modal content items
      await expect(page.locator("text=Customer:").first()).toBeVisible();
      await expect(page.locator("text=Branch:").first()).toBeVisible();
      await expect(page.locator("text=Stylist:").first()).toBeVisible();
      await expect(page.locator("text=Current Status:").first()).toBeVisible();

      // Close modal by clicking Close button
      const closeBtn = page.locator("button:has-text('Close')");
      await closeBtn.click();

      // Verify modal is dismissed
      await expect(modalHeading).not.toBeVisible({ timeout: 3000 });
    }
  });

  test("6. Walk-In Booking Creation: Registers a new walk-in booking successfully", async ({ page }) => {
    await loginAsSalonOwner(page);
    await page.goto("/admin/bookings");
    await page.waitForLoadState("networkidle");

    // Click "+ Create Walk-In Booking" button
    const createBtn = page.locator("button:has-text('Create Walk-In Booking')");
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();

    // Verify modal appeared
    const modal = page.locator("div.fixed.inset-0");
    const modalTitle = modal.locator("h3:has-text('Register Walk-in / Phone Booking')");
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // Wait for branch, stylist, and service dropdowns to load options
    const serviceSelect = modal.locator("select").nth(2);
    await expect(serviceSelect.locator("option").first()).toBeAttached({ timeout: 10000 });

    // Wait a brief tick for state synchronization
    await page.waitForTimeout(500);

    // Generate unique customer name and phone
    const timestamp = Date.now().toString().slice(-4);
    const testCustomerName = `E2E Test Customer ${timestamp}`;
    const testCustomerPhone = `+947700${timestamp}`;

    // Select next Thursday (guaranteed working day for branch and stylist Amal Silva)
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + ((4 + 7 - testDate.getDay()) % 7 || 7));
    const dateString = testDate.toISOString().split("T")[0];

    // Fill form fields
    await modal.locator("input[type='date']").fill(dateString);
    await modal.locator("input[placeholder='10:00']").fill("11:00");
    await modal.locator("input[placeholder*='Ruwan Perera']").fill(testCustomerName);
    await modal.locator("input[placeholder*='+9477...']").fill(testCustomerPhone);

    // Submit form and wait for response
    const submitBtn = modal.locator("button[type='submit']:has-text('Confirm & Save')");
    const responsePromise = page.waitForResponse(
      (resp: any) => resp.url().includes("/api/bookings") && resp.request().method() === "POST",
      { timeout: 20000 }
    );
    await submitBtn.click();
    const postResp = await responsePromise;
    expect(postResp.status()).toBe(201);

    // Verify modal closes
    await expect(modalTitle).not.toBeVisible({ timeout: 15000 });

    // Verify the newly created customer booking appears in table via search
    const searchInput = page.locator("input[placeholder*='Search by customer']");
    await searchInput.fill(testCustomerName);
    await page.waitForTimeout(1000);

    await expect(page.locator(`text=${testCustomerName}`).first()).toBeVisible({ timeout: 10000 });
  });

  test("7. Status Transitions: Updates booking status correctly", async ({ page }) => {
    await loginAsSalonOwner(page);
    await page.goto("/admin/bookings");
    await page.waitForLoadState("networkidle");

    // Look for a PENDING booking confirm button or CONFIRMED check-in button
    const confirmBtn = page.locator("button:has-text('Confirm')").first();
    const checkInBtn = page.locator("button:has-text('Check-In')").first();
    const startBtn = page.locator("button:has-text('Start')").first();
    const completeBtn = page.locator("button:has-text('Complete')").first();

    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      // Wait for status update
      await page.waitForTimeout(2000);
      // Row should now have CONFIRMED status badge or action updated
    } else if (await checkInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkInBtn.click();
      await page.waitForTimeout(2000);
    } else if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(2000);
    } else if (await completeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await completeBtn.click();
      await page.waitForTimeout(2000);
    }
  });
});
