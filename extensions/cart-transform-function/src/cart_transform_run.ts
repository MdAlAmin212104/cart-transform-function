import type {
  CartTransformRunInput,
  CartTransformRunResult,
  Operation,
  ExpandedItem,
} from "../generated/api";

const NO_CHANGES: CartTransformRunResult = {
  operations: [],
};

function normalizeVariantId(variantId: string): string {
  const trimmed = variantId.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("gid://shopify/ProductVariant/")) {
    return trimmed;
  }
  if (trimmed.startsWith("gid://")) {
    return trimmed;
  }
  return `gid://shopify/ProductVariant/${trimmed}`;
}

function parsePrice(priceStr: string | null | undefined): number | null {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

export function cartTransformRun(input: CartTransformRunInput): CartTransformRunResult {
  console.error("=================== [Cart Transform Run] ===================");
  console.error(`Total Cart Lines: ${input.cart.lines.length}`);

  const operations: Operation[] = [];

  for (const line of input.cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") {
      continue;
    }

    const mainVariantId = line.merchandise.id;

    // Check add-on variant attributes
    const rawAddonValue =
      line.addonVariants?.value ||
      line.addonVariantsAlt?.value ||
      line.addons?.value ||
      line.addonsAlt?.value;

    const configuredPriceValue = line.configuredPrice?.value;
    const addonPriceValue = line.addonPrice?.value || line.addonPriceAlt?.value;

    console.error(`Checking Line ID: ${line.id}`);
    console.error(`Main Variant: ${mainVariantId}`);
    console.error(`Raw Add-ons: "${rawAddonValue || ""}"`);
    console.error(`Configured Price: "${configuredPriceValue || ""}"`);

    // --- STRATEGY 1: Expand Operation (Bundling Main Variant + Add-on Variants) ---
    if (rawAddonValue && rawAddonValue.trim()) {
      // Parse add-on variant IDs and FILTER OUT mainVariantId (Prevents double counting base variant)
      const rawVariantIds = rawAddonValue
        .split(",")
        .map((v) => normalizeVariantId(v))
        .filter((v) => v.length > 0 && v !== mainVariantId);

      if (rawVariantIds.length > 0) {
        const expandedCartItems: ExpandedItem[] = [
          {
            merchandiseId: mainVariantId,
            quantity: 1,
          },
          ...rawVariantIds.map((variantId) => ({
            merchandiseId: variantId,
            quantity: 1,
          })),
        ];

        console.error(`Applying lineExpand for Line: ${line.id} with ${expandedCartItems.length} components`);

        operations.push({
          lineExpand: {
            cartLineId: line.id,
            expandedCartItems,
          },
        });
        continue;
      }
    }

    // --- STRATEGY 2: Line Price Update (When no variant IDs, update line unit price directly) ---
    const parsedConfiguredPrice = parsePrice(configuredPriceValue);
    const parsedAddonPrice = parsePrice(addonPriceValue);
    const originalUnitPrice = parseFloat(String(line.cost.amountPerQuantity.amount)) || 0;

    let targetUnitPrice: number | null = null;

    if (parsedConfiguredPrice !== null && parsedConfiguredPrice > 0) {
      // Configured price is ALREADY the full unit price ($2,904.95)
      targetUnitPrice = parsedConfiguredPrice;
    } else if (parsedAddonPrice !== null && parsedAddonPrice > 0) {
      // Add-on price is delta only ($2,155.00), so add base + addon
      targetUnitPrice = originalUnitPrice + parsedAddonPrice;
    }

    if (targetUnitPrice !== null && targetUnitPrice > 0 && targetUnitPrice !== originalUnitPrice) {
      const formattedAmount = targetUnitPrice.toFixed(2);
      console.error(`Applying lineUpdate for Line: ${line.id} to Unit Price: $${formattedAmount}`);

      operations.push({
        lineUpdate: {
          cartLineId: line.id,
          price: {
            adjustment: {
              fixedPricePerUnit: {
                amount: formattedAmount,
              },
            },
          },
        },
      });
      continue;
    }
  }

  console.error(`Total Operations Generated: ${operations.length}`);
  console.error("============================================================");

  return operations.length > 0 ? { operations } : NO_CHANGES;
}
