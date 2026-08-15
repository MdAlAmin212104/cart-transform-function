import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getAdminSavedCartDetails } from "../services/saved-cart.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  if (!id) {
    throw new Response("Missing Cart ID", { status: 400 });
  }

  const cart = await getAdminSavedCartDetails(session.shop, id);
  if (!cart) {
    throw new Response("Saved Cart Not Found", { status: 404 });
  }

  return {
    shop: session.shop,
    cart,
  };
};

export default function AdminSavedCartDetails() {
  const { cart } = useLoaderData<typeof loader>();

  const createdDate = new Date(cart.createdAt).toLocaleString();
  const updatedDate = new Date(cart.updatedAt).toLocaleString();
  const expiresDate = cart.expiresAt ? new Date(cart.expiresAt).toLocaleString() : "Never";

  return (
    <s-page heading={`Saved Cart Details: ${cart.token.slice(0, 12)}...`}>
      <s-section heading="Cart Overview">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <div style={{ padding: "1rem", background: "#f6f6f7", borderRadius: "8px" }}>
            <s-text color="subdued">Customer</s-text>
            <div style={{ fontWeight: 600, fontSize: "15px", marginTop: "4px" }}>
              {cart.customerName || "Storefront Customer"}
            </div>
            <div style={{ fontSize: "13px", color: "#6d7175" }}>
              {cart.customerEmail || `ID: ${cart.customerId}`}
            </div>
          </div>

          <div style={{ padding: "1rem", background: "#f6f6f7", borderRadius: "8px" }}>
            <s-text color="subdued">Status & Items</s-text>
            <div style={{ marginTop: "4px" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: cart.status === "active" ? "#dcfce7" : "#fee2e2",
                  color: cart.status === "active" ? "#166534" : "#991b1b",
                }}
              >
                {cart.status.toUpperCase()}
              </span>
              <span style={{ marginLeft: "8px", fontWeight: 500 }}>{cart.itemCount} total units</span>
            </div>
          </div>

          <div style={{ padding: "1rem", background: "#f6f6f7", borderRadius: "8px" }}>
            <s-text color="subdued">Expires On</s-text>
            <div style={{ fontWeight: 600, fontSize: "15px", marginTop: "4px" }}>{expiresDate}</div>
            <div style={{ fontSize: "12px", color: "#6d7175" }}>Created: {createdDate}</div>
          </div>
        </div>

        <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px" }}>
          <s-text color="subdued">Shareable Storefront URL</s-text>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "6px" }}>
            <input
              type="text"
              readOnly
              value={cart.shareUrl}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #bbf7d0",
                background: "#ffffff",
                fontSize: "14px",
              }}
            />
            <s-button
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(cart.shareUrl);
                alert("Share URL copied to clipboard!");
              }}
            >
              Copy Link
            </s-button>
          </div>
        </div>
      </s-section>

      <s-section heading={`Preserved Items (${cart.items.length} unique items)`}>
        <div style={{ overflowX: "auto", border: "1px solid #e1e3e5", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#f6f6f7", borderBottom: "1px solid #e1e3e5" }}>
                <th style={{ padding: "12px 16px" }}>Product & Variant</th>
                <th style={{ padding: "12px 16px" }}>Variant ID</th>
                <th style={{ padding: "12px 16px" }}>Quantity</th>
                <th style={{ padding: "12px 16px" }}>Line Item Properties (Preserved for Cart Transform)</th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map((item: any, idx: number) => {
                const hasProperties = item.properties && Object.keys(item.properties).length > 0;

                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #f1f2f3" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        {item.image && (
                          <img
                            src={item.image}
                            alt=""
                            style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px" }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>{item.product_title || item.title || "Custom Product"}</div>
                          {item.variant_title && (
                            <div style={{ fontSize: "12px", color: "#6d7175" }}>{item.variant_title}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      <code>{item.variant_id}</code>
                    </td>

                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>{item.quantity}</td>

                    <td style={{ padding: "12px 16px" }}>
                      {hasProperties ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {Object.entries(item.properties).map(([k, v]) => (
                            <div
                              key={k}
                              style={{
                                fontSize: "12px",
                                background: "#f4f4f5",
                                padding: "3px 6px",
                                borderRadius: "4px",
                                display: "inline-block",
                              }}
                            >
                              <strong>{k}:</strong> {String(v)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "12px" }}>
                          No custom properties
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </s-section>

      <s-section slot="aside" heading="Navigation">
        <s-link href="/app/saved-carts">
          <s-button variant="secondary">← Back to All Saved Carts</s-button>
        </s-link>
      </s-section>
    </s-page>
  );
}
