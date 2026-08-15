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
  // Strip currency symbols, commas, whitespace
  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

export function cartTransformRun(input: CartTransformRunInput): CartTransformRunResult {
  console.error("=================== [Cart Transform Run] ===================");
  console.error(`Total Cart Lines: ${input.cart.lines.length}`);

  const operations: Operation[] = [];

  for (const line of input.cart.lines) {
    console.error(`--- Checking Line ID: ${line.id} ---`);
    console.error(`Merchandise Type: ${line.merchandise.__typename}`);

    if (line.merchandise.__typename !== "ProductVariant") {
      console.error(`Skipping line ${line.id}: merchandise is not a ProductVariant`);
      continue;
    }

    const mainVariantId = line.merchandise.id;
    console.error(`Main Variant ID: ${mainVariantId} (${line.merchandise.title || "No Title"})`);

    // Check all possible add-on variant attributes
    const rawAddonValue =
      line.addonVariants?.value ||
      line.addonVariantsAlt?.value ||
      line.addons?.value ||
      line.addonsAlt?.value;

    const configuredPriceValue = line.configuredPrice?.value;
    const addonPriceValue = line.addonPrice?.value || line.addonPriceAlt?.value;
    const bundleIdValue = line.bundleId?.value;

    console.error(`Raw Add-on Variants: "${rawAddonValue || ""}"`);
    console.error(`Configured Price: "${configuredPriceValue || ""}"`);
    console.error(`Add-on Price: "${addonPriceValue || ""}"`);
    console.error(`Bundle ID: "${bundleIdValue || ""}"`);

    // --- STRATEGY 1: Expand Operation (when _addon_variants are provided) ---
    if (rawAddonValue && rawAddonValue.trim()) {
      const rawVariantIds = rawAddonValue
        .split(",")
        .map((v) => normalizeVariantId(v))
        .filter((v) => v.length > 0);

      if (rawVariantIds.length > 0) {
        const variantQuantityMap = new Map<string, number>();

        // Add main variant
        variantQuantityMap.set(mainVariantId, (variantQuantityMap.get(mainVariantId) || 0) + 1);

        // Add all add-on variants
        for (const variantId of rawVariantIds) {
          variantQuantityMap.set(variantId, (variantQuantityMap.get(variantId) || 0) + 1);
        }

        const expandedCartItems: ExpandedItem[] = Array.from(variantQuantityMap.entries()).map(
          ([merchandiseId, quantity]) => ({
            merchandiseId,
            quantity,
          })
        );

        console.error(`Generating lineExpand with components: ${JSON.stringify(expandedCartItems, null, 2)}`);

        operations.push({
          lineExpand: {
            cartLineId: line.id,
            expandedCartItems,
          },
        });
        continue;
      }
    }

    // --- STRATEGY 2: Line Price Update (add main base price + add-on price) ---
    const parsedConfiguredPrice = parsePrice(configuredPriceValue);
    const parsedAddonPrice = parsePrice(addonPriceValue);
    const originalUnitPrice = parseFloat(String(line.cost.amountPerQuantity.amount)) || 0;

    const extraAddonPrice =
      parsedConfiguredPrice !== null && parsedConfiguredPrice > 0
        ? parsedConfiguredPrice
        : parsedAddonPrice !== null && parsedAddonPrice > 0
        ? parsedAddonPrice
        : null;

    if (extraAddonPrice !== null && extraAddonPrice > 0) {
      const targetUnitPrice = originalUnitPrice + extraAddonPrice;
      const formattedAmount = targetUnitPrice.toFixed(2);

      console.error(
        `Adding Base Price ($${originalUnitPrice.toFixed(2)}) + Add-on Price ($${extraAddonPrice.toFixed(2)}) = Total: $${formattedAmount}`
      );
      console.error(`Generating lineUpdate for line ${line.id} to new price: $${formattedAmount}`);

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

    console.error(`No transform operation applied for line ${line.id}.`);
  }

  console.error(`Total Operations Generated: ${operations.length}`);
  console.error("============================================================");

  if (operations.length === 0) {
    return NO_CHANGES;
  }

  return {
    operations,
  };
}



