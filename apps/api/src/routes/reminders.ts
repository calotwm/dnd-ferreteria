import type { FastifyInstance } from "fastify";
import { authenticate, authorize } from "../middleware/auth.js";
import { listOverdueDebts } from "../services/debtService.js";

export async function reminderRoutes(app: FastifyInstance) {
  app.get(
    "/reminders",
    { preHandler: [authenticate, authorize("clients", "read")] },
    async (request) => {
      const debts = await listOverdueDebts(request.user!.businessId);
      return debts.map((d) => ({
        id: d.id,
        customerId: d.customerId,
        customerName: d.customer.name,
        customerPhone: d.customer.phone,
        remainingCents: d.remainingCents,
        totalCents: d.totalCents,
        dueAt: d.dueAt,
      }));
    },
  );
}
