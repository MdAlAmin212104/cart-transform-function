import { useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function ThemeSetupGuide() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const snippetFileCode = `<div class="saved-cart-btn-wrapper {{ class }}">
  <button
    type="button"
    class="saved-cart-button"
    data-saved-cart-trigger
    {% if customer %}
      data-customer-id="{{ customer.id }}"
      data-customer-email="{{ customer.email }}"
      data-customer-name="{{ customer.name }}"
    {% endif %}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
    <span>{{ button_label | default: 'Share Cart Link' }}</span>
  </button>
</div>`;

  const oneLineRenderCode = `{% render 'save-cart-button' %}`;

  const customRenderCode = `{% render 'save-cart-button', button_label: 'Save Cart', class: 'custom-save-btn' %}`;

  const standaloneButtonCode = `<button type="button" class="saved-cart-button" data-saved-cart-trigger>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
  <span>Share Cart Link</span>
</button>`;

  const inlineSimpleButtonCode = `<button type="button" class="saved-cart-button" data-saved-cart-trigger>Share Cart Link</button>`;

  const codeBoxStyle: React.CSSProperties = {
    position: "relative",
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    padding: "16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    overflowX: "auto",
    marginTop: "8px",
    marginBottom: "12px",
    border: "1px solid #1e293b",
    lineHeight: "1.5",
  };

  const copyButtonStyle = (isCopied: boolean): React.CSSProperties => ({
    position: "absolute",
    top: "10px",
    right: "10px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "600",
    color: isCopied ? "#ffffff" : "#0f172a",
    backgroundColor: isCopied ? "#16a34a" : "#f1f5f9",
    border: "1px solid " + (isCopied ? "#15803d" : "#cbd5e1"),
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
  });

  return (
    <s-page heading="Theme Setup & Render Guide">
      {/* Overview Banner */}
      <s-section heading="Quick Installation Overview">
        <s-paragraph>
          You can render and place the <strong>Save / Share Cart Button</strong> anywhere in your Shopify theme (Cart Page, AJAX Cart Drawer, Header, or Custom Liquid sections) using simple 1-line render snippets.
        </s-paragraph>
      </s-section>

      {/* Method 1: Theme Snippet (Recommended) */}
      <s-section heading="Method 1: 1-Line Liquid Render (Recommended)">
        <s-paragraph>
          <strong>Step 1:</strong> In your Shopify Theme Editor, create a new snippet file named <code>snippets/save-cart-button.liquid</code> and paste the following code:
        </s-paragraph>

        <div style={codeBoxStyle}>
          <button
            type="button"
            style={copyButtonStyle(copiedId === "snippet-code")}
            onClick={() => copyToClipboard(snippetFileCode, "snippet-code")}
          >
            {copiedId === "snippet-code" ? "Copied!" : "Copy Snippet Code"}
          </button>
          <pre style={{ margin: 0 }}>{snippetFileCode}</pre>
        </div>

        <s-paragraph>
          <strong>Step 2:</strong> Render the button anywhere in your theme templates (e.g. <code>cart-drawer.liquid</code>, <code>main-cart-items.liquid</code>, or <code>cart.liquid</code>) by adding this 1-line code:
        </s-paragraph>

        <div style={codeBoxStyle}>
          <button
            type="button"
            style={copyButtonStyle(copiedId === "render-1line")}
            onClick={() => copyToClipboard(oneLineRenderCode, "render-1line")}
          >
            {copiedId === "render-1line" ? "Copied!" : "Copy 1-Line Render"}
          </button>
          <pre style={{ margin: 0 }}>{oneLineRenderCode}</pre>
        </div>

        <s-paragraph>
          <strong>Optional Customization:</strong> You can pass custom button labels or CSS classes as parameters:
        </s-paragraph>

        <div style={codeBoxStyle}>
          <button
            type="button"
            style={copyButtonStyle(copiedId === "render-custom")}
            onClick={() => copyToClipboard(customRenderCode, "render-custom")}
          >
            {copiedId === "render-custom" ? "Copied!" : "Copy Custom Code"}
          </button>
          <pre style={{ margin: 0 }}>{customRenderCode}</pre>
        </div>
      </s-section>

      {/* Method 2: App Embed & Direct Button Tag */}
      <s-section heading="Method 2: App Embed & Direct Button Tag">
        <s-paragraph>
          <strong>1. Enable App Embed:</strong> Open your Shopify Theme Customizer &rarr; <em>Theme Settings</em> &rarr; <em>App Embeds</em> &rarr; Enable <strong>"Saved Cart Core Embed"</strong> and click Save.
        </s-paragraph>
        <s-paragraph>
          <strong>2. Insert Direct Button:</strong> Once the embed is active, you can place a button with the <code>data-saved-cart-trigger</code> attribute in any Liquid template or Custom Liquid block:
        </s-paragraph>

        <div style={codeBoxStyle}>
          <button
            type="button"
            style={copyButtonStyle(copiedId === "standalone-btn")}
            onClick={() => copyToClipboard(standaloneButtonCode, "standalone-btn")}
          >
            {copiedId === "standalone-btn" ? "Copied!" : "Copy Button Code"}
          </button>
          <pre style={{ margin: 0 }}>{standaloneButtonCode}</pre>
        </div>

        <s-paragraph>
          Or minimal inline HTML button:
        </s-paragraph>

        <div style={codeBoxStyle}>
          <button
            type="button"
            style={copyButtonStyle(copiedId === "inline-btn")}
            onClick={() => copyToClipboard(inlineSimpleButtonCode, "inline-btn")}
          >
            {copiedId === "inline-btn" ? "Copied!" : "Copy Simple Tag"}
          </button>
          <pre style={{ margin: 0 }}>{inlineSimpleButtonCode}</pre>
        </div>
      </s-section>

      {/* Technical Attributes Reference */}
      <s-section slot="aside" heading="Features & Data Attributes">
        <s-unordered-list>
          <s-list-item>
            <strong>data-saved-cart-trigger:</strong> Triggers the automatic cart serialization, backend API call, and copyable share link generation.
          </s-list-item>
          <s-list-item>
            <strong>AJAX Cart Drawer Support:</strong> Uses global event delegation so dynamically opened flyout / slide-over cart drawers work seamlessly without re-initialization.
          </s-list-item>
          <s-list-item>
            <strong>Customer Association:</strong> Automatically associates saved carts with logged-in customers for easy recovery.
          </s-list-item>
          <s-list-item>
            <strong>Auto-Restore:</strong> When a customer opens a shared link (e.g. <code>/cart?token=...</code>), products are automatically added to their cart.
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
