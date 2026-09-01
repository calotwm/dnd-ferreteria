import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProductPicker from "./ProductPicker";
import { useCartStore } from "../stores/cartStore";

vi.mock("../api/client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../api/client";

const martillo = {
  id: "p1",
  name: "Martillo",
  barcode: "7790001",
  imageUrl: null,
  priceCents: 500,
  stock: 10,
  variants: [{ id: "v1", priceCents: 500, stock: 10 }],
};

function renderPicker() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProductPicker />
    </QueryClientProvider>,
  );
}

describe("ProductPicker catalog panels", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
    vi.mocked(apiFetch).mockReset();
    vi.mocked(apiFetch).mockResolvedValue([martillo]);
  });

  it("renders a product panel and adds the default variant to the cart on click", async () => {
    renderPicker();

    const panel = await screen.findByRole("button", { name: /agregar martillo al carrito/i });
    expect(screen.getByText("Martillo")).toBeInTheDocument();

    await userEvent.click(panel);

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]).toMatchObject({
      variantId: "v1",
      productId: "p1",
      productName: "Martillo",
      unitPriceCents: 500,
      qty: 1,
    });
  });

  it("filters panels client-side and flags low stock (<5)", async () => {
    vi.mocked(apiFetch).mockResolvedValue([
      martillo,
      {
        id: "p2",
        name: "Destornillador",
        barcode: null,
        imageUrl: null,
        priceCents: 300,
        stock: 3,
        variants: [{ id: "v2", priceCents: 300, stock: 3 }],
      },
    ]);
    renderPicker();

    await screen.findByText("Martillo");
    expect(screen.getByText("Stock bajo")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/buscar producto/i), "martillo");

    await waitFor(() => expect(screen.queryByText("Destornillador")).not.toBeInTheDocument());
    expect(screen.getByText("Martillo")).toBeInTheDocument();
  });
});
