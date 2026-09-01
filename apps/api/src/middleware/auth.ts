import type { FastifyReply, FastifyRequest } from "fastify";
import { authorize as canAuthorize, type Action, type Module, type Role } from "@dnd/shared";
import { verifyAccessToken } from "../lib/tokens.js";

export interface AuthUser {
  id: string;
  businessId: string;
  branchId: string | null;
  role: Role;
}

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser | null;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "No token provided" } });
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    request.user = {
      id: payload.sub,
      businessId: payload.businessId,
      branchId: payload.branchId,
      role: payload.role,
    };
  } catch {
    return reply.code(401).send({ error: { code: "TOKEN_EXPIRED", message: "Token expired or invalid" } });
  }
}

/**
 * RBAC guard factory. Enforces `authorize(role, module, action)` on the route.
 * Requires `authenticate` to have run first (attach both as preHandlers).
 */
export function authorize(module: Module, action: Action) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
    }
    if (!canAuthorize(user.role, module, action)) {
      return reply
        .code(403)
        .send({ error: { code: "FORBIDDEN", message: `No access to ${module}:${action}` } });
    }
  };
}
