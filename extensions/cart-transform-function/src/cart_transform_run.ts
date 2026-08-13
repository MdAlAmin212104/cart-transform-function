import type {
  CartTransformRunInput,
  CartTransformRunResult,
  Operation,
} from "../generated/api";

const NO_CHANGES: CartTransformRunResult = {
  operations: [],
};

export function cartTransformRun(input: CartTransformRunInput): CartTransformRunResult {
  const operations: Operation[] = [];

  for (const line of input.cart.lines) {
    // 1. _addon_price অথবা addon_price Attribute চেক করা হচ্ছে
    const addonPriceValue = line.addonPrice?.value || line.addonPriceAlt?.value;

    if (!addonPriceValue) {
      continue;
    }

    const addonPrice = parseFloat(addonPriceValue);
    if (isNaN(addonPrice) || addonPrice <= 0) {
      continue;
    }

    // 2. অরিজিনাল ইউজার প্রাইস এবং অ্যাড-অন প্রাইস যোগ করা হচ্ছে
    const originalUnitPrice = parseFloat(String(line.cost.amountPerQuantity.amount));
    const newUnitPrice = (originalUnitPrice + addonPrice).toFixed(2);

    // 3. নতুন দাম আপডেট করার Operation তৈরি করা হচ্ছে
    operations.push({
      lineUpdate: {
        cartLineId: line.id,
        price: {
          adjustment: {
            fixedPricePerUnit: {
              amount: newUnitPrice,
            },
          },
        },
      },
    });
  }

  if (operations.length === 0) {
    return NO_CHANGES;
  }

  return {
    operations,
  };
}
