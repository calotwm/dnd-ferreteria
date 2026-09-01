import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { Server as SocketIOServer } from "socket.io";
import path from "node:path";
import fs from "node:fs";

import { config } from "./config.js";
import { verifyAccessToken } from "./lib/tokens.js";
import { setSocketServer } from "./lib/socket.js";
import { AppError } from "./lib/errors.js";
import { stringifyBigInt } from "@dnd/shared";

import { authRoutes } from "./routes/auth.js";
import { categoryRoutes } from "./routes/categories.js";
import { productRoutes } from "./routes/products.js";
import { variantRoutes } from "./routes/variants.js";
import { importRoutes } from "./routes/import.js";
import { saleRoutes } from "./routes/sales.js";
import { expenseCategoryRoutes } from "./routes/expense-categories.js";
import { expenseRoutes } from "./routes/expenses.js";
import { supplierRoutes } from "./routes/suppliers.js";
import { purchaseRoutes } from "./routes/purchases.js";
import { customerRoutes } from "./routes/customers.js";
import { abonoRoutes } from "./routes/abonos.js";
import { reminderRoutes } from "./routes/reminders.js";
import { userRoutes } from "./routes/users.js";
import { sellerRoutes } from "./routes/sellers.js";
import { cashSessionRoutes } from "./routes/cash-sessions.js";
import { statsRoutes } from "./routes/stats.js";
import { catalogRoutes } from "./routes/catalog-items.js";
import { imageRoutes } from "./routes/images.js";
import { receiptRoutes } from "./routes/receipts.js";
import { onboardingRoutes } from "./routes/onboarding.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: config.env === "development",
    bodyLimit: 15 * 1024 * 1024, // allow xlsx/multipart uploads
  });

  // BigInt-safe JSON serialization (Prisma BIGINT money gotcha).
  app.setReplySerializer(stringifyBigInt);

  app.register(cors, { origin: false }); // same-origin only; no CORS
  app.register(cookie);
  app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  app.get("/health", async () => ({ ok: true, uptime: process.uptime() }));

  // --- API routes ---
  app.register(authRoutes);
  app.register(categoryRoutes);
  app.register(productRoutes);
  app.register(variantRoutes);
  app.register(importRoutes);
  app.register(saleRoutes);
  app.register(expenseCategoryRoutes);
  app.register(expenseRoutes);
  app.register(supplierRoutes);
  app.register(purchaseRoutes);
  app.register(customerRoutes);
  app.register(abonoRoutes);
  app.register(reminderRoutes);
  app.register(userRoutes);
  app.register(sellerRoutes);
  app.register(cashSessionRoutes);
  app.register(statsRoutes);
  app.register(catalogRoutes);
  app.register(imageRoutes);
  app.register(receiptRoutes);
  app.register(onboardingRoutes);

  // --- Serve the built SPA (production) ---
  const staticDir = process.env.STATIC_DIR ?? path.resolve(process.cwd(), "apps/web/dist");
  if (fs.existsSync(staticDir)) {
    app.register(fastifyStatic, {
      root: staticDir,
      prefix: "/",
      wildcard: false,
    });

    app.setNotFoundHandler((request, reply) => {
      const acceptsHtml = (request.headers.accept ?? "").includes("text/html");
      if (request.method === "GET" && acceptsHtml && !request.url.startsWith("/auth")) {
        return reply.sendFile("index.html");
      }
      return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Not found" } });
    });
  }

  // --- Error handler ---
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
    }
    const err = error as Error & { statusCode?: number };
    const statusCode = err.statusCode ?? 500;
    const message = err.message ?? "Internal server error";
    app.log.error(err);
    return reply.code(statusCode).send({ error: { code: "INTERNAL", message } });
  });

  return app;
}

export function attachSocketIO(app: FastifyInstance) {
  const io = new SocketIOServer(app.server, {
    cors: { origin: false },
    serveClient: false,
  });

  io.use((socket, next) => {
    const token = (socket.handshake.auth?.token as string) ?? "";
    try {
      const payload = verifyAccessToken(token);
      (socket as unknown as { user: unknown }).user = payload;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = (socket as unknown as { user: { businessId: string; branchId: string | null } }).user;
    socket.join(`business:${user.businessId}`);
    if (user.branchId) socket.join(`branch:${user.branchId}`);
  });

  setSocketServer(io);
  return io;
}
