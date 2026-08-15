/**
 * Shopify Saved Cart Theme Extension Client
 */
(function () {
  var PROXY_BASE = "/apps/saved-cart";

  async function handleSaveCart(button) {
    var originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="saved-cart-spinner"></span> Saving...';

    try {
      var cartRes = await fetch("/cart.js", { headers: { Accept: "application/json" } });
      if (!cartRes.ok) throw new Error("Could not read cart.");
      var cartData = await cartRes.json();

      if (!cartData.items || cartData.items.length === 0) {
        alert("Your cart is empty. Please add products before sharing.");
        button.disabled = false;
        button.innerHTML = originalText;
        return;
      }

      var payloadItems = cartData.items.map(function (item) {
        return {
          variant_id: item.variant_id || item.id,
          quantity: item.quantity,
          properties: item.properties || undefined,
          product_title: item.product_title || item.title,
          variant_title: item.variant_title,
          image: (item.featured_image && item.featured_image.url) || item.image,
          handle: item.handle,
          price: item.price,
        };
      });

      var customerId = button.dataset.customerId || (window.__st && window.__st.cid ? String(window.__st.cid) : undefined);
      var customerEmail = button.dataset.customerEmail || undefined;
      var customerName = button.dataset.customerName || undefined;

      var saveRes = await fetch(PROXY_BASE + "/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          items: payloadItems,
          customer_id: customerId,
          customer_email: customerEmail,
          customer_name: customerName,
        }),
      });

      var textResp = await saveRes.text();
      var result = {};
      try {
        result = JSON.parse(textResp);
      } catch (parseErr) {
        throw new Error(textResp || "Failed to parse server response.");
      }

      if (!saveRes.ok || !result.success) {
        throw new Error(result.message || result.error || "Failed to save cart.");
      }

      var fullShareUrl = result.data.shareUrl;
      if (!fullShareUrl || !fullShareUrl.includes("/cart?token=")) {
        fullShareUrl = window.location.origin + "/cart?token=" + encodeURIComponent(result.data.token);
      }

      openSavedCartModal(fullShareUrl);
    } catch (err) {
      console.error("[SavedCart Error]", err);
      alert(err.message || "An error occurred while saving your cart.");
    } finally {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }

  function openSavedCartModal(shareUrl) {
    var modal = document.getElementById("saved-cart-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "saved-cart-modal";
      modal.className = "saved-cart-modal-backdrop";
      modal.innerHTML =
        '<div class="saved-cart-modal-card">' +
        '<div class="saved-cart-modal-header">' +
        '<h3 class="saved-cart-modal-title">Shareable Cart Link</h3>' +
        '<button type="button" class="saved-cart-modal-close" id="saved-cart-modal-close-btn">&times;</button>' +
        '</div>' +
        '<p style="color: #4b5563; font-size: 14px; margin: 0 0 12px 0;">Anyone who opens this link will have your exact products and properties loaded directly into their cart.</p>' +
        '<div class="saved-cart-share-box">' +
        '<input type="text" readonly id="saved-cart-share-url" class="saved-cart-share-input" />' +
        '<button type="button" class="saved-cart-button" id="saved-cart-copy-btn" style="width: auto; padding: 10px 16px;">Copy</button>' +
        '</div>' +
        '<div id="saved-cart-copy-feedback" style="display: none; color: #16a34a; font-size: 13px; font-weight: 600; margin-top: 4px;">Link copied to clipboard!</div>' +
        '</div>';
      document.body.appendChild(modal);

      document.getElementById("saved-cart-modal-close-btn").addEventListener("click", function () {
        modal.classList.remove("is-active");
      });

      document.getElementById("saved-cart-copy-btn").addEventListener("click", function () {
        var input = document.getElementById("saved-cart-share-url");
        input.select();
        navigator.clipboard.writeText(input.value);
        var feedback = document.getElementById("saved-cart-copy-feedback");
        feedback.style.display = "block";
        setTimeout(function () {
          feedback.style.display = "none";
        }, 3000);
      });

      modal.addEventListener("click", function (e) {
        if (e.target === modal) modal.classList.remove("is-active");
      });
    }

    var input = document.getElementById("saved-cart-share-url");
    if (input) input.value = shareUrl;
    modal.classList.add("is-active");
  }

  function cleanUrlToken() {
    var url = new URL(window.location.href);
    if (url.searchParams.has("token")) {
      url.searchParams.delete("token");
      window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ""));
    }
  }

  function showCartNotification(message, type) {
    var existing = document.getElementById("saved-cart-toast");
    if (existing) existing.remove();

    var toast = document.createElement("div");
    toast.id = "saved-cart-toast";
    toast.style.position = "fixed";
    toast.style.top = "24px";
    toast.style.right = "24px";
    toast.style.zIndex = "999999";
    toast.style.padding = "14px 22px";
    toast.style.borderRadius = "8px";
    toast.style.fontSize = "14px";
    toast.style.fontWeight = "600";
    toast.style.boxShadow = "0 10px 25px -3px rgba(0,0,0,0.15)";
    toast.style.transition = "all 0.3s ease";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "10px";

    if (type === "success") {
      toast.style.background = "#15803d";
      toast.style.color = "#ffffff";
    } else if (type === "error") {
      toast.style.background = "#b91c1c";
      toast.style.color = "#ffffff";
    } else {
      toast.style.background = "#1f2937";
      toast.style.color = "#ffffff";
    }

    toast.innerHTML = (type === "info" ? '<span class="saved-cart-spinner" style="width:16px; height:16px; border-width:2px;"></span> ' : '') + '<span>' + message + '</span>';
    document.body.appendChild(toast);

    if (type !== "info") {
      setTimeout(function () {
        toast.style.opacity = "0";
        setTimeout(function () { toast.remove(); }, 300);
      }, 4000);
    }

    return toast;
  }

  async function handleAutoRestoreOnCartPage(token) {
    var restoreKey = "restored_cart_token_" + token;
    if (sessionStorage.getItem(restoreKey)) {
      cleanUrlToken();
      return;
    }

    var banner = showCartNotification("Loading shared cart products...", "info");

    try {
      var res = await fetch(PROXY_BASE + "/api/cart/" + encodeURIComponent(token));
      var textData = await res.text();
      var data = {};
      try {
        data = JSON.parse(textData);
      } catch (_) {
        data = { success: false, message: textData };
      }

      if (res.status === 410) {
        if (banner) banner.remove();
        showCartNotification("This shared cart link has expired.", "error");
        cleanUrlToken();
        return;
      }

      if (!res.ok || !data.success) {
        if (banner) banner.remove();
        showCartNotification(data.message || "Unable to load shared cart.", "error");
        cleanUrlToken();
        return;
      }

      var items = data.data.items;
      if (!items || items.length === 0) {
        if (banner) banner.remove();
        cleanUrlToken();
        return;
      }

      var cartAddPayload = {
        items: items.map(function (item) {
          return {
            id: item.variant_id,
            quantity: item.quantity,
            properties: item.properties || {},
          };
        }),
      };

      var addRes = await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(cartAddPayload),
      });

      if (!addRes.ok) {
        var errJson = await addRes.json().catch(function () { return {}; });
        throw new Error(errJson.description || errJson.message || "Failed to add items to cart.");
      }

      sessionStorage.setItem(restoreKey, "true");
      if (banner) banner.remove();
      showCartNotification("Products loaded into your cart!", "success");

      cleanUrlToken();
      setTimeout(function () {
        window.location.reload();
      }, 400);
    } catch (err) {
      console.error("[AutoRestore Error]", err);
      if (banner) banner.remove();
      showCartNotification(err.message || "Could not load shared cart products.", "error");
      cleanUrlToken();
    }
  }

  function init() {
    document.querySelectorAll("[data-saved-cart-trigger]").forEach(function (btn) {
      if (btn.dataset.initialized) return;
      btn.dataset.initialized = "true";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        handleSaveCart(btn);
      });
    });

    // Handle direct /cart?token=... auto restore
    var urlParams = new URLSearchParams(window.location.search);
    var token = urlParams.get("token");
    if (token) {
      handleAutoRestoreOnCartPage(token);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
