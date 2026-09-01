import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { getStorage } from "../lib/storage.js";
import { badRequest } from "../lib/errors.js";

/**
 * Product image upload. Multipart → storage adapter → R2 URL or DB BLOB fallback.
 */
export async function imageRoutes(app: FastifyInstance) {
  const guard = { preHandler: [authenticate, authorize("inventory", "update")] };

  app.post("/images", guard, async (request, reply) => {
    const data = await request.file();
    if (!data) throw badRequest("No file provided");
    const { productId } = request.query as { productId?: string };
    if (!productId) throw badRequest("productId query required");

    const buffer = await data.toBuffer();
    const key = `products/${productId}/${Date.now()}-${data.filename}`;
    const result = await getStorage().save(key, buffer, data.mimetype);

    const image = await prisma.productImage.create({
      data: {
        productId,
        storage: result.storage,
        url: result.url,
        data: result.data ? new Uint8Array(result.data) : undefined,
      },
    });

    // Keep the product's primary image URL in sync for the catalog.
    if (result.url) {
      await prisma.product.update({ where: { id: productId }, data: { imageUrl: result.url } });
    }

    return reply.code(201).send({
      id: image.id,
      storage: image.storage,
      url: image.url,
      productId,
    });
  });
}
