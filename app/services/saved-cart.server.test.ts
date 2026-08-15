import { describe, it, expect, beforeEach } from "vitest";
import {
  generateSecureToken,
  sanitizeCartItems,
  createSavedCart,
  getPublicSavedCartByToken,
  getCustomerSavedCarts,
  deleteCustomerSavedCart,
  getAdminSavedCartStats,
} from "./saved-cart.server";
import prisma from "../db.server";

describe("Saved Cart Server Service", () => {
  const testShop = "test-store.myshopify.com";
  const customerA = "cust_12345";
  const customerB = "cust_67890";

  beforeEach(async () => {
    // Clean up test data
    await prisma.savedCart.deleteMany({
      where: { shop: testShop },
    });
  });

  it("generates high-entropy secure tokens", () => {
    const token1 = generateSecureToken();
    const token2 = generateSecureToken();
    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toEqual(token2);
    expect(token1.length).toBeGreaterThanOrEqual(30);
  });

  it("sanitizes cart items and preserves exact line item properties without modifying keys", () => {
    const rawItems = [
      {
        variant_id: "45678901234",
        quantity: 2,
        product_title: "Custom Configured Ring",
        variant_title: "Size 8 / 18k Gold",
        properties: {
          _addon_variants: "gid://shopify/ProductVariant/998877",
          _configured_price: "2904.95",
          _bundle_id: "bundle-abc",
          Engraving: "Forever & Always",
        },
      },
    ];

    const sanitized = sanitizeCartItems(rawItems);
    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].variant_id).toBe(45678901234);
    expect(sanitized[0].quantity).toBe(2);
    expect(sanitized[0].properties).toEqual({
      _addon_variants: "gid://shopify/ProductVariant/998877",
      _configured_price: "2904.95",
      _bundle_id: "bundle-abc",
      Engraving: "Forever & Always",
    });
  });

  it("rejects invalid or empty cart items", () => {
    expect(() => sanitizeCartItems([])).toThrow("Cart is empty");
    expect(() => sanitizeCartItems([{ variant_id: "invalid", quantity: 1 }])).toThrow("invalid variant ID");
    expect(() => sanitizeCartItems([{ variant_id: 123, quantity: 0 }])).toThrow("invalid quantity");
  });

  it("creates a saved cart and retrieves it via public share token", () => {
    return (async () => {
      const created = await createSavedCart({
        shop: testShop,
        customerId: customerA,
        customerEmail: "john@example.com",
        customerName: "John Doe",
        items: [
          {
            variant_id: 12345,
            quantity: 1,
            product_title: "Test T-Shirt",
            properties: { Size: "Medium" },
          },
        ],
        expirationDays: 30,
      });

      expect(created.token).toBeDefined();
      expect(created.shareUrl).toContain(created.token);
      expect(created.itemCount).toBe(1);

      // Retrieve via public token
      const publicCart = await getPublicSavedCartByToken(created.token);
      expect(publicCart.success).toBe(true);
      if (publicCart.success) {
        expect(publicCart.data.items).toHaveLength(1);
        expect(publicCart.data.items[0].variant_id).toBe(12345);
        expect(publicCart.data.items[0].properties).toEqual({ Size: "Medium" });
      }
    })();
  });

  it("enforces customer isolation (customer A cannot access customer B's list)", async () => {
    await createSavedCart({
      shop: testShop,
      customerId: customerA,
      items: [{ variant_id: 111, quantity: 1 }],
    });

    await createSavedCart({
      shop: testShop,
      customerId: customerB,
      items: [{ variant_id: 222, quantity: 3 }],
    });

    const cartsA = await getCustomerSavedCarts(testShop, customerA);
    const cartsB = await getCustomerSavedCarts(testShop, customerB);

    expect(cartsA).toHaveLength(1);
    expect(cartsB).toHaveLength(1);
    expect(cartsA[0].itemCount).toBe(1);
    expect(cartsB[0].itemCount).toBe(3);
  });

  it("allows customer to delete their saved cart", async () => {
    const created = await createSavedCart({
      shop: testShop,
      customerId: customerA,
      items: [{ variant_id: 111, quantity: 1 }],
    });

    // Customer B cannot delete Customer A's cart
    const deleteUnauthorized = await deleteCustomerSavedCart(testShop, customerB, created.id);
    expect(deleteUnauthorized.success).toBe(false);

    // Customer A can delete their cart
    const deleteAuthorized = await deleteCustomerSavedCart(testShop, customerA, created.id);
    expect(deleteAuthorized.success).toBe(true);

    const cartsA = await getCustomerSavedCarts(testShop, customerA);
    expect(cartsA).toHaveLength(0);
  });

  it("handles expired carts correctly", async () => {
    const created = await createSavedCart({
      shop: testShop,
      customerId: customerA,
      items: [{ variant_id: 111, quantity: 1 }],
      expirationDays: -1, // Expired yesterday
    });

    const publicLookup = await getPublicSavedCartByToken(created.token);
    expect("error" in publicLookup && publicLookup.error).toBe("EXPIRED");
  });

  it("calculates accurate admin dashboard stats", async () => {
    await createSavedCart({
      shop: testShop,
      customerId: customerA,
      items: [{ variant_id: 111, quantity: 1 }],
      expirationDays: 30,
    });

    await createSavedCart({
      shop: testShop,
      customerId: customerB,
      items: [{ variant_id: 222, quantity: 2 }],
      expirationDays: -2, // Expired
    });

    const stats = await getAdminSavedCartStats(testShop);
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(1);
    expect(stats.expired).toBe(1);
    expect(stats.savedToday).toBe(2);
  });
});
