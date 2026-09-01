import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding DND Ferretería demo data…");

  const existing = await prisma.user.count();
  let business;
  let branch;

  if (existing === 0) {
    business = await prisma.business.create({
      data: { name: "DND Ferretería", currency: "ARS", ivaRate: 0 },
    });
    branch = await prisma.branch.create({
      data: { businessId: business.id, name: "Sucursal Principal" },
    });
  } else {
    business = (await prisma.business.findFirst())!;
    branch = (await prisma.branch.findFirst())!;
  }

  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@dnd.com" },
    create: {
      businessId: business.id,
      branchId: branch.id,
      name: "Administrador",
      email: "admin@dnd.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
    update: {},
  });

  const sellerPassword = await bcrypt.hash("seller123", 10);
  await prisma.user.upsert({
    where: { email: "vendedor@dnd.com" },
    create: {
      businessId: business.id,
      branchId: branch.id,
      name: "Vendedor",
      email: "vendedor@dnd.com",
      passwordHash: sellerPassword,
      role: "SELLER",
    },
    update: {},
  });

  const categoryNames = ["Herramientas", "Fijaciones", "Pinturas", "Electricidad"];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { id: `seed-${name}` },
      create: { id: `seed-${name}`, businessId: business.id, name },
      update: {},
    });
    categories[name] = cat.id;
  }

  const products = [
    { name: "Martillo de carpintero", barcode: "7790000000011", cost: 2500, price: 4500, cat: "Herramientas", stock: 24 },
    { name: "Destornillador Phillips", barcode: "7790000000028", cost: 1200, price: 2200, cat: "Herramientas", stock: 3 },
    { name: "Caja de tornillos 6x1", barcode: "7790000000035", cost: 800, price: 1500, cat: "Fijaciones", stock: 60 },
    { name: "Tarugos plásticos x50", barcode: "7790000000042", cost: 400, price: 900, cat: "Fijaciones", stock: 4 },
    { name: "Látex interior blanco 4L", barcode: "7790000000059", cost: 8000, price: 14500, cat: "Pinturas", stock: 12 },
    { name: "Cable unipolar 2,5mm", barcode: "7790000000066", cost: 900, price: 1800, cat: "Electricidad", stock: 30 },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { id: `seed-${p.barcode}` },
      create: {
        id: `seed-${p.barcode}`,
        businessId: business.id,
        categoryId: categories[p.cat],
        name: p.name,
        barcode: p.barcode,
        costCents: p.cost,
        priceCents: p.price,
        variants: { create: [{ id: `seed-v-${p.barcode}`, barcode: p.barcode, priceCents: p.price, costCents: p.cost, stock: p.stock }] },
      },
      update: {},
    });
    void product;
  }

  const customers = [
    { name: "Juan Pérez", phone: "5491123456789" },
    { name: "María Gómez", phone: "5491198765432" },
    { name: "Construcciones del Sur SRL", phone: "5491155554444" },
  ];
  for (const c of customers) {
    await prisma.customer.upsert({
      where: { id: `seed-c-${c.phone}` },
      create: { id: `seed-c-${c.phone}`, businessId: business.id, name: c.name, phone: c.phone },
      update: {},
    });
  }

  await prisma.supplier.upsert({
    where: { id: "seed-sup-1" },
    create: { id: "seed-sup-1", businessId: business.id, name: "Ferretería Mayorista SA", phone: "5491144443333" },
    update: {},
  });

  // Seed a couple of demo sales (raw records for handoff demo).
  const saleCount = await prisma.sale.count();
  if (saleCount === 0) {
    const hammer = await prisma.variant.findUnique({ where: { id: "seed-v-7790000000011" } });
    const screws = await prisma.variant.findUnique({ where: { id: "seed-v-7790000000035" } });
    const customer = await prisma.customer.findUnique({ where: { id: "seed-c-5491123456789" } });

    if (hammer && screws && customer) {
      const sale = await prisma.sale.create({
        data: {
          businessId: business.id,
          branchId: branch.id,
          sellerId: admin.id,
          customerId: customer.id,
          totalCents: 4500 + 2 * 1500,
          discountCents: 0,
          items: {
            create: [
              { productId: hammer.productId, variantId: hammer.id, qty: 1, unitPriceCents: 4500 },
              { productId: screws.productId, variantId: screws.id, qty: 2, unitPriceCents: 1500 },
            ],
          },
          payments: { create: [{ method: "EFECTIVO", amountCents: 7500 }] },
          receipts: {
            create: [{ number: `R-DEMO-${Date.now()}`, totalCents: 7500 }],
          },
        },
      });
      void sale;
    }
  }

  console.log("✅ Seed complete.");
  console.log("   Admin: admin@dnd.com / admin123");
  console.log("   Vendedor: vendedor@dnd.com / seller123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
