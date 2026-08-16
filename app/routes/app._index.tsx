import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import { getAdminSavedCarts, getAdminSavedCartStats } from "../services/saved-cart.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "all";
  const search = url.searchParams.get("search") || "";

  const [stats, carts] = await Promise.all([
    getAdminSavedCartStats(session.shop),
    getAdminSavedCarts(session.shop, { status, search }),
  ]);

  return {
    shop: session.shop,
    stats,
    carts,
    status,
    search,
  };
};

export default function AdminSavedCartsIndex() {
  const { stats, carts, status, search } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  const handleStatusFilter = (newStatus: string) => {
    const params = new URLSearchParams(window.location.search);
    if (newStatus === "all") {
      params.delete("status");
    } else {
      params.set("status", newStatus);
    }
    setSearchParams(params);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = (formData.get("q") as string) || "";
    const params = new URLSearchParams(window.location.search);
    if (q) {
      params.set("search", q);
    } else {
      params.delete("search");
    }
    setSearchParams(params);
  };

  return (
    <s-page heading="Saved Carts">
      {/* Summary KPI Metrics */}
      <s-section heading="Overview">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              padding: "1rem",
              background: "var(--p-color-bg-surface-secondary, #f6f6f7)",
              borderRadius: "8px",
              border: "1px solid #e1e3e5",
            }}
          >
            <s-text color="subdued">Total Saved</s-text>
            <div style={{ fontSize: "1.75rem", fontWeight: "bold", marginTop: "4px" }}>
              {stats.total}
            </div>
          </div>

          <div
            style={{
              padding: "1rem",
              background: "#f0fdf4",
              borderRadius: "8px",
              border: "1px solid #bbf7d0",
            }}
          >
            <s-text color="subdued">Active Carts</s-text>
            <div style={{ fontSize: "1.75rem", fontWeight: "bold", color: "#15803d", marginTop: "4px" }}>
              {stats.active}
            </div>
          </div>

          <div
            style={{
              padding: "1rem",
              background: "#fef2f2",
              borderRadius: "8px",
              border: "1px solid #fecaca",
            }}
          >
            <s-text color="subdued">Expired Carts</s-text>
            <div style={{ fontSize: "1.75rem", fontWeight: "bold", color: "#b91c1c", marginTop: "4px" }}>
              {stats.expired}
            </div>
          </div>

          <div
            style={{
              padding: "1rem",
              background: "#faf5ff",
              borderRadius: "8px",
              border: "1px solid #e9d5ff",
            }}
          >
            <s-text color="subdued">Saved This Week</s-text>
            <div style={{ fontSize: "1.75rem", fontWeight: "bold", color: "#7e22ce", marginTop: "4px" }}>
              {stats.savedThisWeek}
            </div>
          </div>
        </div>
      </s-section>

      {/* Filter and Search Bar */}
      <s-section heading="Customer Saved Carts">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1rem",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <s-button
              variant={status === "all" ? "primary" : "secondary"}
              onClick={() => handleStatusFilter("all")}
            >
              All ({stats.total})
            </s-button>
            <s-button
              variant={status === "active" ? "primary" : "secondary"}
              onClick={() => handleStatusFilter("active")}
            >
              Active ({stats.active})
            </s-button>
            <s-button
              variant={status === "expired" ? "primary" : "secondary"}
              onClick={() => handleStatusFilter("expired")}
            >
              Expired ({stats.expired})
            </s-button>
          </div>

          <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Search customer, token..."
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #c9cccf",
                fontSize: "14px",
              }}
            />
            <s-button type="submit" variant="secondary">
              Search
            </s-button>
          </form>
        </div>

        {/* Saved Carts Table */}
        {carts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#6d7175" }}>
            <s-heading>No Saved Carts Found</s-heading>
            <s-paragraph>
              {search || status !== "all"
                ? "Try adjusting your search query or status filter."
                : "Saved carts created by customers will appear here."}
            </s-paragraph>
          </div>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid #e1e3e5", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "#f6f6f7", borderBottom: "1px solid #e1e3e5" }}>
                  <th style={{ padding: "12px 16px" }}>Customer</th>
                  <th style={{ padding: "12px 16px" }}>Items</th>
                  <th style={{ padding: "12px 16px" }}>Created</th>
                  <th style={{ padding: "12px 16px" }}>Expires</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px" }}>Share Token</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {carts.map((cart) => {
                  const createdDate = new Date(cart.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const expiresDate = cart.expiresAt
                    ? new Date(cart.expiresAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Never";

                  return (
                    <tr
                      key={cart.id}
                      style={{
                        borderBottom: "1px solid #f1f2f3",
                        transition: "background 0.15s",
                      }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600 }}>
                          {cart.customerName || (cart.customerEmail ? cart.customerEmail.split("@")[0] : `Customer #${cart.customerId}`)}
                        </div>
                        {cart.customerEmail && (
                          <div style={{ fontSize: "12px", color: "#6d7175" }}>{cart.customerEmail}</div>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontWeight: 500 }}>{cart.itemCount} items</span>
                      </td>

                      <td style={{ padding: "12px 16px", color: "#5c5f62" }}>{createdDate}</td>
                      <td style={{ padding: "12px 16px", color: "#5c5f62" }}>{expiresDate}</td>

                      <td style={{ padding: "12px 16px" }}>
                        {cart.status === "active" ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              background: "#dcfce7",
                              color: "#166534",
                            }}
                          >
                            Active
                          </span>
                        ) : cart.status === "expired" ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              background: "#fee2e2",
                              color: "#991b1b",
                            }}
                          >
                            Expired
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              background: "#f3f4f6",
                              color: "#374151",
                            }}
                          >
                            {cart.status}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <code
                          style={{
                            background: "#f4f4f5",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "12px",
                          }}
                        >
                          {cart.token.slice(0, 10)}...
                        </code>
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <s-link href={`/app/saved-carts/${cart.id}`}>
                          <s-button variant="secondary">View Details</s-button>
                        </s-link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </s-section>
    </s-page>
  );
}
