import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Demo catalog images. Real Unsplash CDN photos (verified stable) mapped to the
 * closest ferretería category. `?w=400&q=80&auto=format&fit=crop` keeps payloads
 * small. Every URL below was checked to return HTTP 200.
 */
const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=400&q=80&auto=format&fit=crop`;

const IMG = {
  toolsPegboard: img("1504148455328-c376907d081c"),
  toolSet: img("1621905251189-08b45d6a269e"),
  wrench: img("1581783898377-1c85bf937427"),
  drill: img("1581244277943-fe4a9c777189"),
  toolsAlt: img("1572981779307-38b8cabb2407"),
  toolsAlt2: img("1581092918056-0c4c3acd3789"),
  ladder: img("1507680434567-5739c80be1ac"),
  screws: img("1513467535987-fd81bc7d62f8"),
  bolts: img("1590959651373-a3db0f38a961"),
  hinge: img("1603988363607-e1e4a66962c6"),
  paint: img("1530124566582-a618bc2615dc"),
  paintCans: img("1562259949-e8e7689d7828"),
  paintRoller: img("1562259929-b4e1fd3aef09"),
  paintBrush: img("1604014237800-1c9102c219da"),
  bulb: img("1558618666-fcd25c85cd64"),
  cable: img("1563262924-641a8b3d397f"),
  wires: img("1544724569-5f546fd6f2b5"),
  switch: img("1581091226825-a6a2a5aee158"),
  socket: img("1621972750749-0fbb1abb7736"),
  pipes: img("1540574163026-643ea20ade25"),
  plumbing: img("1581093588401-fbb62a02f120"),
  pipeWrench: img("1581092160562-40aa08e78837"),
  faucet: img("1585704032915-c3400ca199e7"),
  hardware: img("1504328345606-18bbc8c9d7d1"),
  padlock: img("1595841696677-6489ff3f8cd1"),
} as const;

interface SeedProduct {
  name: string;
  barcode: string;
  cost: number;
  price: number;
  cat: string;
  stock: number;
  description: string;
  image: string;
}

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

  const categoryNames = [
    "Herramientas",
    "Fijaciones",
    "Pinturas",
    "Electricidad",
    "Plomería",
    "Ferretería",
  ];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { id: `seed-${name}` },
      create: { id: `seed-${name}`, businessId: business.id, name },
      update: {},
    });
    categories[name] = cat.id;
  }

  const products: SeedProduct[] = [
    // Herramientas
    { name: "Martillo de carpintero", barcode: "7790000000011", cost: 2500, price: 4500, cat: "Herramientas", stock: 40, description: "Martillo de carpintero con mango de madera.", image: IMG.toolsPegboard },
    { name: "Destornillador Phillips", barcode: "7790000000028", cost: 1200, price: 2200, cat: "Herramientas", stock: 120, description: "Destornillador Phillips punta imantada.", image: IMG.toolSet },
    { name: "Pinza universal 8\"", barcode: "7790000000073", cost: 1800, price: 3200, cat: "Herramientas", stock: 80, description: "Pinza universal con mangos aislados.", image: IMG.toolsAlt },
    { name: "Llave francesa 10\"", barcode: "7790000000080", cost: 3200, price: 5800, cat: "Herramientas", stock: 45, description: "Llave francesa regulable 10 pulgadas.", image: IMG.wrench },
    { name: "Taladro percutor 650W", barcode: "7790000000097", cost: 42000, price: 69000, cat: "Herramientas", stock: 12, description: "Taladro percutor con percusión y regulador de velocidad.", image: IMG.drill },
    { name: "Sierra manual para madera", barcode: "7790000000103", cost: 2200, price: 3900, cat: "Herramientas", stock: 35, description: "Serrucho de carpintero de dientes finos.", image: IMG.toolsAlt },
    { name: "Cinta métrica 5m", barcode: "7790000000110", cost: 1500, price: 2800, cat: "Herramientas", stock: 90, description: "Cinta métrica con freno y cinta de acero.", image: IMG.toolsAlt2 },
    { name: "Nivel de burbuja 60cm", barcode: "7790000000127", cost: 2600, price: 4600, cat: "Herramientas", stock: 30, description: "Nivel de burbuja de aluminio 60 cm.", image: IMG.toolSet },
    { name: "Escalera de aluminio 3 tramos", barcode: "7790000000134", cost: 35000, price: 58000, cat: "Herramientas", stock: 8, description: "Escalera extensible de aluminio 3 tramos.", image: IMG.ladder },
    { name: "Juego de llaves hexagonales", barcode: "7790000000141", cost: 1900, price: 3400, cat: "Herramientas", stock: 55, description: "Juego de llaves Allen 1,5 a 10 mm.", image: IMG.wrench },

    // Fijaciones
    { name: "Caja de tornillos 6x1", barcode: "7790000000035", cost: 800, price: 1500, cat: "Fijaciones", stock: 200, description: "Caja de 100 tornillos 6x1 punta aguja.", image: IMG.screws },
    { name: "Tarugos plásticos x50", barcode: "7790000000042", cost: 400, price: 900, cat: "Fijaciones", stock: 300, description: "Tarugos de expansión N°8, bolsa por 50.", image: IMG.bolts },
    { name: "Clavos de acero 2\" x500g", barcode: "7790000000158", cost: 600, price: 1100, cat: "Fijaciones", stock: 250, description: "Clavos de acero punta común, paquete 500 g.", image: IMG.screws },
    { name: "Bulones galvanizados 8x60 x10", barcode: "7790000000165", cost: 1500, price: 2700, cat: "Fijaciones", stock: 120, description: "Bulones galvanizados 8x60 con tuerca y arandela, x10.", image: IMG.bolts },
    { name: "Arandelas planas x100", barcode: "7790000000172", cost: 300, price: 700, cat: "Fijaciones", stock: 400, description: "Arandelas planas de acero zincado, bolsa x100.", image: IMG.bolts },
    { name: "Tirafondos 6x40 x20", barcode: "7790000000189", cost: 1100, price: 2000, cat: "Fijaciones", stock: 180, description: "Tirafondos autoperforantes 6x40, bolsa x20.", image: IMG.screws },

    // Pinturas
    { name: "Látex interior blanco 4L", barcode: "7790000000059", cost: 8000, price: 14500, cat: "Pinturas", stock: 60, description: "Látex interior lavable blanco, balde 4 litros.", image: IMG.paintCans },
    { name: "Esmalte sintético brillante 1L", barcode: "7790000000202", cost: 5500, price: 9800, cat: "Pinturas", stock: 40, description: "Esmalte sintético brillante para metal y madera.", image: IMG.paint },
    { name: "Membrana impermeabilizante 10L", barcode: "7790000000219", cost: 18000, price: 29900, cat: "Pinturas", stock: 25, description: "Membrana elástica impermeabilizante para techos.", image: IMG.paintRoller },
    { name: "Pincel de cerda 2\"", barcode: "7790000000226", cost: 900, price: 1800, cat: "Pinturas", stock: 150, description: "Pincel de cerda natural 2 pulgadas.", image: IMG.paintBrush },
    { name: "Rodillo de lana 24cm", barcode: "7790000000233", cost: 1400, price: 2600, cat: "Pinturas", stock: 100, description: "Rodillo de lana 24 cm con mango.", image: IMG.paintRoller },
    { name: "Lija al agua P80 x10", barcode: "7790000000240", cost: 500, price: 950, cat: "Pinturas", stock: 350, description: "Lija al agua grano P80, paquete x10.", image: IMG.paint },
    { name: "Fondo blanco sellador 4L", barcode: "7790000000257", cost: 7000, price: 12500, cat: "Pinturas", stock: 45, description: "Fondo sellador blanco para interiores, 4 litros.", image: IMG.paintCans },

    // Electricidad
    { name: "Cable unipolar 2,5mm (metro)", barcode: "7790000000066", cost: 900, price: 1800, cat: "Electricidad", stock: 150, description: "Cable unipolar de cobre 2,5 mm², venta por metro.", image: IMG.cable },
    { name: "Portalámpara de baquelita", barcode: "7790000000264", cost: 700, price: 1300, cat: "Electricidad", stock: 160, description: "Portalámpara de baquelita para rosca E27.", image: IMG.bulb },
    { name: "Interruptor simple 1 punto", barcode: "7790000000271", cost: 850, price: 1600, cat: "Electricidad", stock: 200, description: "Interruptor de embutir 1 punto color blanco.", image: IMG.switch },
    { name: "Enchufe hembra de embutir", barcode: "7790000000288", cost: 900, price: 1700, cat: "Electricidad", stock: 180, description: "Toma hembra 10A con puesta a tierra.", image: IMG.socket },
    { name: "Llave térmica bipolar 20A", barcode: "7790000000295", cost: 3800, price: 6900, cat: "Electricidad", stock: 70, description: "Disyuntor térmico bipolar 20 amperes.", image: IMG.switch },
    { name: "Cinta aisladora 10m", barcode: "7790000000301", cost: 400, price: 800, cat: "Electricidad", stock: 400, description: "Cinta aisladora de PVC 10 metros.", image: IMG.wires },
    { name: "Cable taller 4mm² (metro)", barcode: "7790000000318", cost: 1400, price: 2600, cat: "Electricidad", stock: 120, description: "Cable flexible taller 4 mm², venta por metro.", image: IMG.cable },

    // Plomería
    { name: "Caño de PVC 110mm x4m", barcode: "7790000000325", cost: 5200, price: 9400, cat: "Plomería", stock: 40, description: "Caño de PVC para desagües 110 mm x 4 m.", image: IMG.pipes },
    { name: "Llave de paso esférica 1/2\"", barcode: "7790000000332", cost: 2800, price: 5100, cat: "Plomería", stock: 90, description: "Llave de paso esférica rosca 1/2 pulgada.", image: IMG.pipeWrench },
    { name: "Cinta teflón x15m", barcode: "7790000000349", cost: 350, price: 700, cat: "Plomería", stock: 300, description: "Cinta teflón PTFE 15 metros para roscas.", image: IMG.plumbing },
    { name: "Canilla de cocina", barcode: "7790000000356", cost: 9500, price: 16900, cat: "Plomería", stock: 35, description: "Canilla de cocina monocomando cromada.", image: IMG.faucet },
    { name: "Sifón desagüe 1 1/4\"", barcode: "7790000000363", cost: 1600, price: 2900, cat: "Plomería", stock: 80, description: "Sifón de desagüe plástico 1 1/4 pulgada.", image: IMG.plumbing },

    // Ferretería
    { name: "Candado de latón 40mm", barcode: "7790000000370", cost: 2100, price: 3900, cat: "Ferretería", stock: 110, description: "Candado de latón macizo 40 mm con 3 llaves.", image: IMG.padlock },
    { name: "Bisagra reforzada 3\" x2", barcode: "7790000000387", cost: 950, price: 1750, cat: "Ferretería", stock: 140, description: "Bisagra reforzada de acero 3 pulgadas, par.", image: IMG.hinge },
    { name: "Cadena galvanizada 3mm x10m", barcode: "7790000000394", cost: 2400, price: 4300, cat: "Ferretería", stock: 60, description: "Cadena galvanizada 3 mm, rollo 10 metros.", image: IMG.hardware },
    { name: "Manija de puerta", barcode: "7790000000400", cost: 3200, price: 5800, cat: "Ferretería", stock: 50, description: "Manija de puerta de acero inoxidable con llave.", image: IMG.hardware },
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
        description: p.description,
        costCents: p.cost,
        priceCents: p.price,
        imageUrl: p.image,
      },
      update: {
        categoryId: categories[p.cat],
        name: p.name,
        description: p.description,
        costCents: p.cost,
        priceCents: p.price,
        imageUrl: p.image,
        active: true,
      },
    });

    // Variant carries the stock. Upsert so a re-run syncs stock to these
    // generous demo levels (and fixes the previously low-stock demo items).
    await prisma.variant.upsert({
      where: { id: `seed-v-${p.barcode}` },
      create: {
        id: `seed-v-${p.barcode}`,
        productId: product.id,
        barcode: p.barcode,
        priceCents: p.price,
        costCents: p.cost,
        stock: p.stock,
      },
      update: {
        barcode: p.barcode,
        priceCents: p.price,
        costCents: p.cost,
        stock: p.stock,
        active: true,
      },
    });
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

  // Verification summary for the deploy log.
  const totalProducts = await prisma.product.count({ where: { businessId: business.id } });
  const withImages = await prisma.product.count({ where: { businessId: business.id, imageUrl: { not: null } } });
  const variants = await prisma.variant.aggregate({
    where: { product: { businessId: business.id } },
    _sum: { stock: true },
    _count: true,
  });
  const lowStock = await prisma.variant.count({
    where: { product: { businessId: business.id }, stock: { lt: 5 } },
  });

  console.log("✅ Seed complete.");
  console.log(`   Productos: ${totalProducts} (${withImages} con imagen)`);
  console.log(`   Variantes: ${variants._count}, stock total: ${variants._sum.stock ?? 0}`);
  console.log(`   Variantes con stock bajo (<5): ${lowStock}`);
  console.log("   Admin: admin@dnd.com / admin123");
  console.log("   Vendedor: vendedor@dnd.com / seller123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
