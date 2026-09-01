import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { notFound } from "../lib/errors.js";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "MANAGER", "SELLER"]),
  branchId: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

const updateUserSchema = createUserSchema.partial().extend({
  password: z.string().min(6).optional(),
});

export async function userRoutes(app: FastifyInstance) {
  const read = { preHandler: [authenticate, authorize("employees", "read")] };
  const write = { preHandler: [authenticate, authorize("employees", "create")] };

  app.get("/users", read, async (request) => {
    return prisma.user.findMany({
      where: { businessId: request.user!.businessId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        branchId: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
  });

  app.post("/users", write, async (request, reply) => {
    const input = createUserSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        businessId: request.user!.businessId,
        branchId: input.branchId ?? request.user!.branchId ?? null,
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        active: input.active ?? true,
      },
      select: { id: true, name: true, email: true, role: true, active: true, branchId: true },
    });
    return reply.code(201).send(user);
  });

  app.put(
    "/users/:id",
    { preHandler: [authenticate, authorize("employees", "update")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = updateUserSchema.parse(request.body);
      const existing = await prisma.user.findFirst({
        where: { id, businessId: request.user!.businessId },
      });
      if (!existing) throw notFound("User not found");

      const data: Record<string, unknown> = {};
      if (input.name) data.name = input.name;
      if (input.email) data.email = input.email;
      if (input.role) data.role = input.role;
      if (input.branchId !== undefined) data.branchId = input.branchId;
      if (input.active !== undefined) data.active = input.active;
      if (input.password) data.passwordHash = await bcrypt.hash(input.password, 10);

      return prisma.user.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, role: true, active: true, branchId: true },
      });
    },
  );

  app.delete(
    "/users/:id",
    { preHandler: [authenticate, authorize("employees", "delete")] },
    async (request) => {
      const { id } = request.params as { id: string };
      if (id === request.user!.id) throw new Error("Cannot delete yourself");
      const existing = await prisma.user.findFirst({
        where: { id, businessId: request.user!.businessId },
      });
      if (!existing) throw notFound("User not found");
      await prisma.user.update({ where: { id }, data: { active: false } });
      return { ok: true };
    },
  );
}
