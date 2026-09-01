import type { FastifyInstance, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { loginSchema, registerSchema } from "@dnd/shared";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type AccessTokenPayload,
} from "../lib/tokens.js";
import { badRequest, conflict, unauthorized } from "../lib/errors.js";
import { authenticate, authorize } from "../middleware/auth.js";

function setRefreshCookie(reply: any, token: string) {
  reply.setCookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.env === "production",
    sameSite: "lax",
    path: "/auth",
    maxAge: 7 * 24 * 60 * 60, // 7d
  });
}

function toAccessPayload(user: {
  id: string;
  businessId: string;
  branchId: string | null;
  role: "ADMIN" | "MANAGER" | "SELLER";
}): AccessTokenPayload {
  return {
    sub: user.id,
    businessId: user.businessId,
    branchId: user.branchId,
    role: user.role,
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return reply.code(401).send({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    }
    if (!user.active) {
      return reply.code(403).send({ error: { code: "DISABLED", message: "Account disabled" } });
    }

    const accessToken = signAccessToken(toAccessPayload(user));
    const refreshToken = signRefreshToken({ sub: user.id, businessId: user.businessId });
    setRefreshCookie(reply, refreshToken);

    const branch = user.branchId
      ? await prisma.branch.findUnique({ where: { id: user.branchId } })
      : null;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchName: branch?.name ?? null,
      },
      accessToken,
    };
  });

  // Bootstrap: first user creates the business + default branch + admin account.
  app.post("/auth/register", async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const existing = await prisma.user.count();
    if (existing > 0) {
      throw conflict("Bootstrap already complete — use the users API to add accounts");
    }

    const business = await prisma.business.create({
      data: { name: "DND Ferretería", currency: "ARS" },
    });
    const branch = await prisma.branch.create({
      data: { businessId: business.id, name: "Sucursal Principal" },
    });
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        name: input.name,
        email: input.email,
        passwordHash,
        role: "ADMIN",
      },
    });

    const accessToken = signAccessToken(toAccessPayload(user));
    const refreshToken = signRefreshToken({ sub: user.id, businessId: user.businessId });
    setRefreshCookie(reply, refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchName: branch.name,
      },
      accessToken,
    };
  });

  app.post("/auth/refresh", async (request: FastifyRequest, reply) => {
    const token = request.cookies[config.cookieName];
    if (!token) throw unauthorized("No refresh token");

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw unauthorized("Invalid refresh token");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) throw unauthorized("User not found");

    // Rotate the refresh token.
    const accessToken = signAccessToken(toAccessPayload(user));
    const refreshToken = signRefreshToken({ sub: user.id, businessId: user.businessId });
    setRefreshCookie(reply, refreshToken);

    return { accessToken };
  });

  app.post("/auth/logout", async (_request, reply) => {
    reply.clearCookie(config.cookieName, { path: "/auth" });
    return { ok: true };
  });

  app.get(
    "/auth/me",
    { preHandler: [authenticate, authorize("dashboard", "read")] },
    async (request) => {
      const user = request.user!;
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { branch: true },
      });
      if (!dbUser) throw unauthorized();
      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        branchId: dbUser.branchId,
        branchName: dbUser.branch?.name ?? null,
        businessName: (await prisma.business.findUnique({ where: { id: dbUser.businessId } }))?.name,
      };
    },
  );
}
