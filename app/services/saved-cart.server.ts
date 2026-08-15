import crypto from "crypto";
import prisma from "../db.server";

export interface SavedCartItem {
  variant_id: number | string;
  quantity: number;
  properties?: Record<string, string | number | boolean | null>;
  product_title?: string;
  variant_title?: string;
  title?: string;
  image?: string;
  handle?: string;
  price?: number | string; // Display-only snapshot
}

export interface SavedCartData {
  version: number;
  items: SavedCartItem[];
}

export function generateSecureToken(): string {
  // 32 cryptographically secure random bytes in hex/base64url format
  return crypto.randomBytes(24).toString("base64url");
}

export function sanitizeCartItems(rawItems: any[]): SavedCartItem[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error("Cart is empty or items array is missing.");
  }

  if (rawItems.length > 100) {
    throw new Error("Cart exceeds maximum allowed items (100).");
  }

  return rawItems.map((raw, index) => {
    // Determine variant ID (from variant_id or id or merchandise id)
    let variantId = raw.variant_id ?? raw.id;
    if (typeof variantId === "string" && variantId.startsWith("gid://shopify/ProductVariant/")) {
      variantId = variantId.replace("gid://shopify/ProductVariant/", "");
    }

    const numericVariantId = Number(variantId);
    if (!variantId || isNaN(numericVariantId) || numericVariantId <= 0) {
      throw new Error(`Item at position ${index + 1} has an invalid variant ID.`);
    }

    const quantity = parseInt(String(raw.quantity), 10);
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error(`Item at position ${index + 1} has an invalid quantity.`);
    }

    // Preserve exact line item properties without modifying keys or casing
    let properties: Record<string, string | number | boolean | null> | undefined = undefined;
    if (raw.properties && typeof raw.properties === "object" && !Array.isArray(raw.properties)) {
      properties = {};
      for (const [key, value] of Object.entries(raw.properties)) {
        if (value !== undefined && value !== null) {
          properties[key] = value as any;
        }
      }
    }

    return {
      variant_id: numericVariantId,
      quantity,
      properties: properties && Object.keys(properties).length > 0 ? properties : undefined,
      product_title: raw.product_title ? String(raw.product_title).slice(0, 255) : undefined,
      variant_title: raw.variant_title ? String(raw.variant_title).slice(0, 255) : undefined,
      title: raw.title ? String(raw.title).slice(0, 255) : undefined,
      image: raw.image || raw.featured_image?.url || raw.featured_image ? String(raw.image || raw.featured_image?.url || raw.featured_image) : undefined,
      handle: raw.handle ? String(raw.handle).slice(0, 255) : undefined,
      price: raw.price !== undefined ? String(raw.price) : undefined,
    };
  });
}

export async function createSavedCart(params: {
  shop: string;
  customerId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  items: any[];
  expirationDays?: number;
}) {
  const { shop, customerId = "guest", customerEmail, customerName, items, expirationDays = 30 } = params;

  if (!shop) throw new Error("Shop domain is required.");

  const sanitizedItems = sanitizeCartItems(items);
  const totalItemCount = sanitizedItems.reduce((sum, item) => sum + item.quantity, 0);

  const cartPayload: SavedCartData = {
    version: 1,
    items: sanitizedItems,
  };

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  // If this is an existing logged-in customer, check if they already have an active saved cart
  if (customerId && customerId !== "guest") {
    const existingCart = await prisma.savedCart.findFirst({
      where: {
        shop,
        customerId: String(customerId),
        status: "active",
      },
      orderBy: { updatedAt: "desc" },
    });

    if (existingCart) {
      // Update the existing record with modified/new items instead of creating redundant rows
      const updatedCart = await prisma.savedCart.update({
        where: { id: existingCart.id },
        data: {
          cartData: JSON.stringify(cartPayload),
          itemCount: totalItemCount,
          customerEmail: customerEmail || existingCart.customerEmail,
          customerName: customerName || existingCart.customerName,
          expiresAt,
        },
      });

      return {
        id: updatedCart.id,
        token: updatedCart.token,
        itemCount: updatedCart.itemCount,
        expiresAt: updatedCart.expiresAt,
        shareUrl: `https://${shop}/cart?token=${updatedCart.token}`,
        isUpdated: true,
      };
    }
  }

  // Otherwise create a new saved cart record
  const token = generateSecureToken();
  const savedCart = await prisma.savedCart.create({
    data: {
      shop,
      customerId: String(customerId),
      customerEmail: customerEmail || null,
      customerName: customerName || null,
      token,
      cartData: JSON.stringify(cartPayload),
      itemCount: totalItemCount,
      status: "active",
      expiresAt,
    },
  });

  return {
    id: savedCart.id,
    token: savedCart.token,
    itemCount: savedCart.itemCount,
    expiresAt: savedCart.expiresAt,
    shareUrl: `https://${shop}/cart?token=${savedCart.token}`,
    isUpdated: false,
  };
}

export async function getPublicSavedCartByToken(token: string) {
  if (!token || typeof token !== "string") {
    return { error: "INVALID_TOKEN", message: "A valid share token is required." };
  }

  const savedCart = await prisma.savedCart.findUnique({
    where: { token: token.trim() },
  });

  if (!savedCart) {
    return { error: "NOT_FOUND", message: "Saved cart not found." };
  }

  if (savedCart.status === "deleted") {
    return { error: "DELETED", message: "This saved cart has been deleted." };
  }

  if (savedCart.expiresAt && new Date() > new Date(savedCart.expiresAt)) {
    return { error: "EXPIRED", message: "This saved cart has expired." };
  }

  let parsedCart: SavedCartData;
  try {
    parsedCart = JSON.parse(savedCart.cartData);
  } catch (e) {
    return { error: "CORRUPTED_DATA", message: "Unable to parse saved cart data." };
  }

  // Authoritative restore items: only variant_id, quantity, properties + display snapshots
  return {
    success: true,
    data: {
      token: savedCart.token,
      itemCount: savedCart.itemCount,
      status: savedCart.status,
      createdAt: savedCart.createdAt,
      expiresAt: savedCart.expiresAt,
      items: parsedCart.items,
    },
  };
}

export async function getCustomerSavedCarts(shop: string, customerId: string) {
  if (!customerId) return [];

  const carts = await prisma.savedCart.findMany({
    where: {
      shop,
      customerId: String(customerId),
      status: { not: "deleted" },
    },
    orderBy: { createdAt: "desc" },
  });

  return carts.map((c) => {
    let items: SavedCartItem[] = [];
    try {
      items = JSON.parse(c.cartData).items || [];
    } catch (_) {}

    const isExpired = c.expiresAt ? new Date() > new Date(c.expiresAt) : false;

    return {
      id: c.id,
      token: c.token,
      itemCount: c.itemCount,
      status: isExpired ? "expired" : c.status,
      createdAt: c.createdAt,
      expiresAt: c.expiresAt,
      shareUrl: `https://${shop}/cart?token=${c.token}`,
      itemsPreview: items.slice(0, 3).map((item) => ({
        title: item.product_title || item.title || "Item",
        variantTitle: item.variant_title,
        quantity: item.quantity,
      })),
    };
  });
}

export async function deleteCustomerSavedCart(shop: string, customerId: string, cartId: string) {
  const existing = await prisma.savedCart.findFirst({
    where: {
      id: cartId,
      shop,
      customerId: String(customerId),
    },
  });

  if (!existing) {
    return { success: false, error: "NOT_FOUND", message: "Cart not found or unauthorized." };
  }

  await prisma.savedCart.update({
    where: { id: cartId },
    data: { status: "deleted" },
  });

  return { success: true };
}

export async function getAdminSavedCarts(shop: string, options?: { status?: string; search?: string }) {
  const where: any = { shop };

  if (options?.status && options.status !== "all") {
    if (options.status === "expired") {
      where.expiresAt = { lt: new Date() };
      where.status = { not: "deleted" };
    } else {
      where.status = options.status;
      if (options.status === "active") {
        where.OR = [{ expiresAt: null }, { expiresAt: { gte: new Date() } }];
      }
    }
  }

  if (options?.search) {
    const q = options.search.trim();
    where.OR = [
      { token: { contains: q } },
      { customerEmail: { contains: q } },
      { customerName: { contains: q } },
      { customerId: { contains: q } },
    ];
  }

  const carts = await prisma.savedCart.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return carts.map((c) => {
    let items: SavedCartItem[] = [];
    try {
      items = JSON.parse(c.cartData).items || [];
    } catch (_) {}

    const isExpired = c.expiresAt ? new Date() > new Date(c.expiresAt) : false;

    return {
      ...c,
      status: isExpired && c.status === "active" ? "expired" : c.status,
      items,
      shareUrl: `https://${shop}/cart?token=${c.token}`,
    };
  });
}

export async function getAdminSavedCartDetails(shop: string, id: string) {
  const cart = await prisma.savedCart.findFirst({
    where: { id, shop },
  });

  if (!cart) return null;

  let items: SavedCartItem[] = [];
  try {
    items = JSON.parse(cart.cartData).items || [];
  } catch (_) {}

  const isExpired = cart.expiresAt ? new Date() > new Date(cart.expiresAt) : false;

  return {
    ...cart,
    status: isExpired && cart.status === "active" ? "expired" : cart.status,
    items,
    shareUrl: `https://${shop}/cart?token=${cart.token}`,
  };
}

export async function getAdminSavedCartStats(shop: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const [total, active, expired, savedToday, savedThisWeek] = await Promise.all([
    prisma.savedCart.count({ where: { shop, status: { not: "deleted" } } }),
    prisma.savedCart.count({
      where: {
        shop,
        status: "active",
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
    }),
    prisma.savedCart.count({
      where: {
        shop,
        status: { not: "deleted" },
        expiresAt: { lt: now },
      },
    }),
    prisma.savedCart.count({
      where: {
        shop,
        createdAt: { gte: todayStart },
      },
    }),
    prisma.savedCart.count({
      where: {
        shop,
        createdAt: { gte: weekStart },
      },
    }),
  ]);

  return {
    total,
    active,
    expired,
    savedToday,
    savedThisWeek,
  };
}
