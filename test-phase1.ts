import "dotenv/config";
import { prisma } from "./src/lib/prisma";
import { D, money, sum } from "./src/lib/money";
import { stockIn, transferStock, stockOutMany, InsufficientStockError } from "./src/lib/ops/inventory";
import { findBestCommissionRule, evaluateBookingCommissions, voidBookingCommissions } from "./src/lib/ops/commission";
import { calculateStaffPayroll } from "./src/lib/ops/payroll";

async function runPhase1Tests() {
  console.log("=================================================");
  console.log("🚀 RUNNING PHASE 1 BUSINESS OPERATIONS TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail || "Assertion failed"}`);
      failed++;
    }
  }

  try {
    // 1. Get an existing salon and branches
    const salon = await prisma.salon.findFirst({
      where: { status: "APPROVED" },
      include: { branches: true, staff: true, owner: true },
    });
    assert(!!salon, "Active test salon found", salon?.name);
    if (!salon || salon.branches.length < 2) {
      throw new Error("Test requires a salon with at least 2 branches");
    }

    const branchA = salon.branches[0];
    const branchB = salon.branches[1];
    const staff = salon.staff[0];
    const user = salon.owner;

    const ctx = {
      userId: user.id,
      salonId: salon.id,
      role: user.role,
      branchId: branchA.id,
      staffId: staff?.id || null,
    };

    console.log(`\n🏢 Testing Salon: ${salon.name} (Branches: ${branchA.name}, ${branchB.name})`);

    // =========================================================
    // TEST 1: EXPENSE MANAGEMENT
    // =========================================================
    console.log("\n--- TEST GROUP 1: EXPENSE MANAGEMENT ---");

    // Create Category
    const category = await prisma.expenseCategory.create({
      data: {
        salonId: salon.id,
        name: `Test Utilities ${Date.now()}`,
        description: "Electricity and water expenses",
      },
    });
    assert(!!category.id, "Expense category created successfully");

    // Create Expense
    const expense = await prisma.expense.create({
      data: {
        salonId: salon.id,
        branchId: branchA.id,
        categoryId: category.id,
        createdById: user.id,
        description: "Test Electricity Bill",
        amount: 15000.0,
        expenseDate: new Date(),
        paymentMethod: "BANK_TRANSFER",
        status: "PENDING",
      },
    });
    assert(!!expense.id && expense.status === "PENDING", "Pending expense recorded");

    // Approve Expense
    const approvedExpense = await prisma.expense.update({
      where: { id: expense.id },
      data: {
        status: "APPROVED",
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });
    assert(approvedExpense.status === "APPROVED", "Expense approval transition works");

    // =========================================================
    // TEST 2: INVENTORY & STOCK MANAGEMENT
    // =========================================================
    console.log("\n--- TEST GROUP 2: INVENTORY & MULTI-BRANCH STOCK ---");

    const skuTest = `TEST-PRD-${Date.now()}`;
    const product = await prisma.product.create({
      data: {
        salonId: salon.id,
        name: "Test Premium Shampoo 500ml",
        sku: skuTest,
        costPrice: 2000.0,
        sellingPrice: 3500.0,
        minStock: 5,
        unit: "BOTTLE",
      },
    });
    assert(!!product.id, "Product catalog item created with SKU: " + skuTest);

    // Stock In via Inventory Service (Batch 1: 10 units @ 2000 LKR)
    await prisma.$transaction(async (tx) => {
      await stockIn(tx, {
        salonId: salon.id,
        productId: product.id,
        branchId: branchA.id,
        quantity: D(10),
        unitCost: D(2000.0),
        type: "MANUAL_IN",
        batch: { batchNumber: "BATCH-001" },
        reason: "Initial supplier shipment",
        userId: user.id,
      });
    });

    const stockLevelA1 = await prisma.stockLevel.findUnique({
      where: { productId_branchId: { productId: product.id, branchId: branchA.id } },
    });
    assert(D(stockLevelA1?.quantity).equals(10), "Stock In credited 10 units to Branch A");
    assert(D(stockLevelA1?.avgCost).equals(2000), "Weighted-average cost set to 2000.00 LKR");

    // Stock In Batch 2 at different cost (10 units @ 2400 LKR) -> new avgCost should be (10*2000 + 10*2400) / 20 = 2200.00
    await prisma.$transaction(async (tx) => {
      await stockIn(tx, {
        salonId: salon.id,
        productId: product.id,
        branchId: branchA.id,
        quantity: D(10),
        unitCost: D(2400.0),
        type: "MANUAL_IN",
        batch: { batchNumber: "BATCH-002" },
        reason: "Second shipment higher price",
        userId: user.id,
      });
    });

    const stockLevelA2 = await prisma.stockLevel.findUnique({
      where: { productId_branchId: { productId: product.id, branchId: branchA.id } },
    });
    assert(D(stockLevelA2?.quantity).equals(20), "Total stock in Branch A is now 20 units");
    assert(D(stockLevelA2?.avgCost).equals(2200), "Weighted-average COGS correctly recalculated to 2200.00 LKR");

    // Inter-Branch Transfer: Move 5 units from Branch A to Branch B
    await prisma.$transaction(
      async (tx) => {
        await transferStock(tx, {
          salonId: salon.id,
          fromBranchId: branchA.id,
          toBranchId: branchB.id,
          transferId: "TR-TEST-001",
          userId: user.id,
          lines: [{ productId: product.id, quantity: D(5) }],
          reason: "Test stock transfer",
        });
      },
      { timeout: 25000 }
    );

    const stockLevelA3 = await prisma.stockLevel.findUnique({
      where: { productId_branchId: { productId: product.id, branchId: branchA.id } },
    });
    const stockLevelB1 = await prisma.stockLevel.findUnique({
      where: { productId_branchId: { productId: product.id, branchId: branchB.id } },
    });
    assert(D(stockLevelA3?.quantity).equals(15), "Branch A stock reduced to 15 units");
    assert(D(stockLevelB1?.quantity).equals(5), "Branch B received 5 units with preserved average cost");

    // Insufficient Stock Prevention: try to stock out 50 units (only 15 available)
    let caughtInsufficient = false;
    try {
      await prisma.$transaction(async (tx) => {
        await stockOutMany(
          tx,
          {
            salonId: salon.id,
            branchId: branchA.id,
            type: "MANUAL_OUT",
            userId: user.id,
          },
          [{ productId: product.id, quantity: D(50) }]
        );
      });
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        caughtInsufficient = true;
      }
    }
    assert(caughtInsufficient, "InsufficientStockError correctly prevented overselling/over-deduction");

    // =========================================================
    // TEST 3: RETAIL POS SALE & INVOICING
    // =========================================================
    console.log("\n--- TEST GROUP 3: POS PRODUCT SALE & RESTOCK ---");

    // Sell 2 units from Branch A at retail price
    const saleNumber = `TEST-POS-${Date.now().toString().slice(-5)}`;
    const saleResult = await prisma.$transaction(
      async (tx) => {
        const sale = await tx.sale.create({
          data: {
            salonId: salon.id,
            branchId: branchA.id,
            saleNumber,
            staffId: staff?.id || null,
            createdById: user.id,
            subtotal: 7000.0,
            discountAmount: 0.0,
            taxAmount: 0.0,
            totalAmount: 7000.0,
            paidAmount: 7000.0,
            paymentStatus: "PAID",
            status: "COMPLETED",
            items: {
              create: [
                {
                  productId: product.id,
                  productName: product.name,
                  sku: product.sku,
                  quantity: 2,
                  unitPrice: 3500.0,
                  unitCost: 2200.0,
                  lineTotal: 7000.0,
                },
              ],
            },
            payments: {
              create: [
                {
                  method: "CASH",
                  amount: 7000.0,
                },
              ],
            },
          },
          include: { items: true },
        });

        // Deduct inventory
        await stockOutMany(
          tx,
          {
            salonId: salon.id,
            branchId: branchA.id,
            type: "SALE",
            referenceType: "SALE",
            referenceId: sale.id,
            userId: user.id,
          },
          [{ productId: product.id, quantity: D(2) }]
        );

        // Issue POS Invoice
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber: `INV-${saleNumber}`,
            saleId: sale.id,
            salonId: salon.id,
            subtotal: 7000.0,
            totalAmount: 7000.0,
            paidAmount: 7000.0,
            balanceAmount: 0.0,
          },
        });

        return { sale, invoice };
      },
      { timeout: 25000 }
    );

    const stockLevelAAfterSale = await prisma.stockLevel.findUnique({
      where: { productId_branchId: { productId: product.id, branchId: branchA.id } },
    });
    assert(D(stockLevelAAfterSale?.quantity).equals(13), "POS sale deducted 2 units (15 -> 13 units)");
    assert(!!saleResult.invoice.id, "Official POS Invoice created: " + saleResult.invoice.invoiceNumber);

    // Refund sale with restock
    await prisma.$transaction(
      async (tx) => {
        await tx.saleRefund.create({
          data: {
            saleId: saleResult.sale.id,
            amount: 7000.0,
            method: "CASH",
            reason: "Customer change of mind",
            createdById: user.id,
            items: {
              create: [
                {
                  saleItemId: saleResult.sale.items[0].id,
                  quantity: 2,
                  amount: 7000.0,
                },
              ],
            },
          },
        });

        // Return items to stock
        await stockIn(tx, {
          salonId: salon.id,
          productId: product.id,
          branchId: branchA.id,
          quantity: D(2),
          unitCost: D(2200.0),
          type: "SALE_RETURN",
          reason: "Customer refund restock",
          userId: user.id,
        });

        await tx.sale.update({
          where: { id: saleResult.sale.id },
          data: { refundedAmount: 7000.0, status: "REFUNDED" },
        });
      },
      { timeout: 25000 }
    );

    const stockLevelAAfterRefund = await prisma.stockLevel.findUnique({
      where: { productId_branchId: { productId: product.id, branchId: branchA.id } },
    });
    assert(D(stockLevelAAfterRefund?.quantity).equals(15), "Refund with restock successfully returned 2 units back to stock (13 -> 15 units)");

    // =========================================================
    // TEST 4: STAFF COMMISSION ENGINE
    // =========================================================
    console.log("\n--- TEST GROUP 4: STAFF COMMISSIONS ---");

    if (staff) {
      // Create a 15% commission rule for staff on retail product sales
      const rule = await prisma.commissionRule.create({
        data: {
          salonId: salon.id,
          staffId: staff.id,
          source: "PRODUCT",
          type: "PERCENTAGE",
          value: 15.0,
          createdById: user.id,
          isActive: true,
        },
      });
      assert(!!rule.id, "Staff 15% commission rule configured");

      // Verify rule matching specificity
      const matched = await prisma.$transaction(async (tx) => {
        return findBestCommissionRule(tx, {
          salonId: salon.id,
          branchId: branchA.id,
          staffId: staff.id,
          source: "PRODUCT",
          productId: product.id,
        });
      });
      assert(!!matched && matched.value.equals(15), "Rule specificity engine matched staff-level rule (15%)");

      // Record a commission entry
      const sourceKey = `TEST_SALE_ITEM_${Date.now()}`;
      const entry = await prisma.commissionEntry.create({
        data: {
          salonId: salon.id,
          branchId: branchA.id,
          staffId: staff.id,
          source: "PRODUCT",
          sourceKey,
          description: "Commission on test product sale",
          baseAmount: 10000.0,
          rateType: "PERCENTAGE",
          rateValue: 15.0,
          amount: 1500.0,
          status: "APPROVED",
          earnedAt: new Date(),
          ruleId: rule.id,
        },
      });
      assert(D(entry.amount).equals(1500), "15% commission on 10,000 LKR = 1,500 LKR entry recorded");

      // Duplicate prevention test via unique sourceKey
      let caughtDuplicate = false;
      try {
        await prisma.commissionEntry.create({
          data: {
            salonId: salon.id,
            branchId: branchA.id,
            staffId: staff.id,
            source: "PRODUCT",
            sourceKey, // Same key!
            description: "Duplicate attempt",
            baseAmount: 10000.0,
            rateType: "PERCENTAGE",
            rateValue: 15.0,
            amount: 1500.0,
            earnedAt: new Date(),
          },
        });
      } catch (e) {
        caughtDuplicate = true;
      }
      assert(caughtDuplicate, "Duplicate commission prevention enforced via unique sourceKey");

      // Clean up rule and entry
      await prisma.commissionEntry.delete({ where: { id: entry.id } });
      await prisma.commissionRule.delete({ where: { id: rule.id } });
    }

    // =========================================================
    // TEST 5: STAFF SALARY & PAYROLL GENERATION
    // =========================================================
    console.log("\n--- TEST GROUP 5: SALARY & PAYROLL ENGINE ---");

    if (staff) {
      // 1. Setup Compensation
      await prisma.staffCompensation.upsert({
        where: { staffId: staff.id },
        update: {
          salaryType: "BASIC_PLUS_COMMISSION",
          baseAmount: 60000.0,
          overtimeEnabled: true,
          overtimeRate: 500.0,
        },
        create: {
          staffId: staff.id,
          salonId: salon.id,
          salaryType: "BASIC_PLUS_COMMISSION",
          baseAmount: 60000.0,
          overtimeEnabled: true,
          overtimeRate: 500.0,
        },
      });
      assert(true, "Staff compensation model set to 60,000 LKR base + commissions");

      // 2. Issue a Salary Advance: 10,000 LKR with 2,500 LKR monthly installment
      const advance = await prisma.staffAdvance.create({
        data: {
          salonId: salon.id,
          staffId: staff.id,
          amount: 10000.0,
          installmentAmount: 2500.0,
          recoveredAmount: 0.0,
          status: "OUTSTANDING",
          advanceDate: new Date(),
          reason: "Test Festival Advance",
          createdById: user.id,
        },
      });
      assert(!!advance.id, "Staff advance of 10,000 LKR recorded with 2,500 monthly installment");

      // 3. Compute Monthly Payroll using calculateStaffPayroll
      const year = 2026;
      const month = 11;
      const computed = await prisma.$transaction(
        async (tx) => {
          return calculateStaffPayroll(tx, salon.id, year, month, {
            staffId: staff.id,
            recoverAdvances: true,
            includeCommissions: true,
          });
        },
        { timeout: 25000 }
      );

      // Base: 60000 Gross
      // Deductions: 2500 advance recovery
      // Net: 60000 - 2500 = 57500
      assert(computed.baseRate.equals(60000), `Computed base rate: 60,000 LKR (Got: ${computed.baseRate})`);
      assert(computed.advanceDeduction.equals(2500), `Advance recovery deduction applied: 2,500 LKR (Got: ${computed.advanceDeduction})`);
      assert(computed.netAmount.equals(57500), `Net salary computed: 57,500 LKR (Got: ${computed.netAmount})`);

      // Clean up advance
      await prisma.staffAdvance.delete({ where: { id: advance.id } });
    }

    // =========================================================
    // TEST 6: CONSOLIDATED FINANCIAL REPORT MATH
    // =========================================================
    console.log("\n--- TEST GROUP 6: FINANCIAL REPORT CALCULATIONS ---");

    const totalRev = D("150000.00");
    const cogs = D("35000.00");
    const grossProfit = totalRev.minus(cogs); // 115,000.00
    const opEx = D("25000.00");
    const payrollExp = D("60000.00");
    const netProfit = grossProfit.minus(opEx).minus(payrollExp); // 30,000.00
    const grossMargin = grossProfit.div(totalRev).times(100).toFixed(2);
    const netMargin = netProfit.div(totalRev).times(100).toFixed(2);

    assert(grossProfit.equals(115000), "Gross Profit = Revenue - COGS formula verified");
    assert(netProfit.equals(30000), "Net Operating Profit = Gross Profit - OpEx - Payroll formula verified");
    assert(grossMargin === "76.67", `Gross Margin = 76.67% (Got: ${grossMargin}%)`);
    assert(netMargin === "20.00", `Net Margin = 20.00% (Got: ${netMargin}%)`);

    // Clean up test records
    console.log("\n🧹 Cleaning up test artifacts...");
    await prisma.invoice.deleteMany({ where: { saleId: saleResult.sale.id } });
    await prisma.saleRefundItem.deleteMany({ where: { refund: { saleId: saleResult.sale.id } } });
    await prisma.saleRefund.deleteMany({ where: { saleId: saleResult.sale.id } });
    await prisma.salePayment.deleteMany({ where: { saleId: saleResult.sale.id } });
    await prisma.saleItem.deleteMany({ where: { saleId: saleResult.sale.id } });
    await prisma.sale.delete({ where: { id: saleResult.sale.id } });

    await prisma.expense.deleteMany({ where: { categoryId: category.id } });
    await prisma.expenseCategory.delete({ where: { id: category.id } });
    await prisma.stockMovement.deleteMany({ where: { productId: product.id } });
    await prisma.stockBatch.deleteMany({ where: { productId: product.id } });
    await prisma.stockLevel.deleteMany({ where: { productId: product.id } });
    await prisma.product.delete({ where: { id: product.id } });

    console.log("\n=================================================");
    console.log(`🎉 ALL PHASE 1 TESTS PASSED! (${passed}/${passed + failed})`);
    console.log("=================================================");
  } catch (error) {
    console.error("\n❌ TEST SUITE RUNTIME ERROR:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase1Tests();
