import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  createSavedCart,
  getPublicSavedCartByToken,
  getCustomerSavedCarts,
  deleteCustomerSavedCart,
} from "../services/saved-cart.server";

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
    },
  });
}

function parseSubpath(request: Request): { subpath: string; token?: string; id?: string } {
  const url = new URL(request.url);
  // Handle paths like /api/proxy/api/save, /api/proxy/save, /apps/saved-cart/api/cart/xyz, etc.
  const raw = url.pathname
    .replace(/^\/api\/proxy\/?/, "")
    .replace(/^\/apps\/saved-cart\/?/, "");
  
  let parts = raw.split("/").filter(Boolean);
  if (parts.length > 0 && parts[0] === "api") {
    parts.shift();
  }

  const subpath = parts[0] || "";
  const token = parts[1] || url.searchParams.get("token") || undefined;
  const id = parts[1] || url.searchParams.get("id") || undefined;

  return { subpath, token, id };
}

async function resolveShop(request: Request): Promise<string> {
  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop");
  if (shopParam) return shopParam;

  try {
    const { session } = await authenticate.public.appProxy(request);
    if (session?.shop) return session.shop;
  } catch (_) {}

  // Fallback to active shop in database
  const sessionRecord = await prisma.session.findFirst({ select: { shop: true } });
  return sessionRecord?.shop || "assignment-dhostctf.myshopify.com";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const loggedInCustomerId = url.searchParams.get("logged_in_customer_id") || "";

  try {
    const shop = await resolveShop(request);
    const { subpath, token } = parseSubpath(request);

    // 1. GET cart by token (e.g. /cart/:token, /api/cart/:token, /saved-cart, ?token=...)
    if (subpath === "cart" || subpath === "saved-cart" || subpath === "get" || (!subpath && token)) {
      const targetToken = token || (subpath === "cart" ? undefined : subpath) || url.searchParams.get("token");
      if (!targetToken) {
        return jsonResponse({ success: false, error: "MISSING_TOKEN", message: "Token is required." }, 400);
      }

      const result = await getPublicSavedCartByToken(targetToken);
      if ("error" in result) {
        if (result.error === "EXPIRED") {
          return jsonResponse({
            success: false,
            error: { code: "SAVED_CART_EXPIRED", message: result.message },
          }, 410);
        }
        if (result.error === "NOT_FOUND") {
          return jsonResponse({
            success: false,
            error: { code: "NOT_FOUND", message: result.message },
          }, 404);
        }
        return jsonResponse({
          success: false,
          error: { code: result.error, message: result.message },
        }, 400);
      }

      return jsonResponse(result, 200);
    }

    // 2. GET /my-carts (Customer-scoped list)
    if (subpath === "my-carts") {
      if (!loggedInCustomerId) {
        return jsonResponse({
          success: false,
          error: "UNAUTHORIZED",
          message: "Customer authentication required.",
        }, 401);
      }

      const carts = await getCustomerSavedCarts(shop, loggedInCustomerId);
      return jsonResponse({ success: true, data: carts }, 200);
    }

    return jsonResponse({ success: false, error: "NOT_FOUND", message: `Unknown endpoint: ${subpath}` }, 404);
  } catch (error: any) {
    //console.error("[App Proxy Loader Error]", error);
    return jsonResponse({
      success: false,
      error: "INTERNAL_ERROR",
      message: error.message || "An unexpected error occurred.",
    }, 500);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const loggedInCustomerId = url.searchParams.get("logged_in_customer_id") || "";

  try {
    const shop = await resolveShop(request);
    const { subpath, id } = parseSubpath(request);

    // 1. POST /save (Save Cart - supports both customer and guest users)
    if (request.method === "POST" && (subpath === "save" || subpath === "")) {
      let body: any = {};
      try {
        body = await request.json();
      } catch (_) {
        return jsonResponse({
          success: false,
          error: "INVALID_JSON",
          message: "Request body must be valid JSON.",
        }, 400);
      }

      const items = body.items;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return jsonResponse({
          success: false,
          error: "EMPTY_CART",
          message: "Your cart is empty. Add products before saving.",
        }, 422);
      }

      const customerId = body.customer_id || loggedInCustomerId || "guest";
      const customerEmail = body.customer_email || url.searchParams.get("customer_email") || undefined;
      const customerName = body.customer_name || undefined;

      const result = await createSavedCart({
        shop,
        customerId,
        customerEmail,
        customerName,
        items,
        expirationDays: 30,
      });

      return jsonResponse({
        success: true,
        data: result,
      }, 200);
    }

    // 2. DELETE /my-carts/:id (Delete saved cart)
    if ((request.method === "DELETE" || request.method === "POST") && subpath === "my-carts") {
      if (!loggedInCustomerId) {
        return jsonResponse({
          success: false,
          error: "UNAUTHORIZED",
          message: "Customer authentication required.",
        }, 401);
      }

      const targetId = id || (await request.json().catch(() => ({}))).id;
      if (!targetId) {
        return jsonResponse({ success: false, error: "MISSING_ID", message: "Cart ID is required." }, 400);
      }

      const result = await deleteCustomerSavedCart(shop, loggedInCustomerId, targetId);
      if (!result.success) {
        return jsonResponse(result, 404);
      }

      return jsonResponse({ success: true }, 200);
    }

    return jsonResponse({ success: false, error: "METHOD_NOT_ALLOWED" }, 405);
  } catch (error: any) {
    //console.error("[App Proxy Action Error]", error);
    return jsonResponse({
      success: false,
      error: "SERVER_ERROR",
      message: error.message || "Failed to process request.",
    }, 500);
  }
};
