import { describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";

/**
 * Integration test for the atomic sale→stock transaction.
 * Requires a dedicated test PostgreSQL database (TEST_DATABASE_URL). Skipped in
 * unit runs — exercised during verification/E2E.
 */
const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasTestDb)("sale→stock atomic transaction (integration)", () => {
  it("rejects a sale when stock is insufficient", async () => {
    // Setup: a variant with stock 2.
    const business = await prisma.business.create({ data: { name: "T", currency: "ARS" } });
    const branch = await prisma.branch.create({ data: { businessId: business.id, name: "B" } });
    const product = await prisma.product.create({
      data: { businessId: business.id, name: "P", priceCents: 100 },
    });
    const variant = await prisma.variant.create({
      data: { productId: product.id, stock: 2, priceCents: 100 },
    });
    const user = await prisma.user.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        name: "T",
        email: `t-${Date.now()}@x.com`,
        passwordHash: "x",
        role: "SELLER",
      },
    });

    const { createSale } = await import("../services/saleService.js");

    // qty 3 vs stock 2 → rejected, stock unchanged.
    await expect(
      createSale(
        {
          items: [{ variantId: variant.id, qty: 3, unitPriceCents: 100 }],
          paymentMethod: "EFECTIVO",
          amountCents: 300,
          discount: null,
          customerId: null,
        },
        { businessId: business.id, branchId: branch.id, sellerId: user.id },
      ),
    ).rejects.toThrow(/Insufficient stock/);

    const after = await prisma.variant.findUnique({ where: { id: variant.id } });
    expect(after?.stock).toBe(2);
  });
});
