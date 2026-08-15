import {
  extension,
  Card,
  BlockStack,
  InlineStack,
  InlineLayout,
  Text,
  Button,
  Link,
  Heading,
  Divider,
} from "@shopify/ui-extensions/customer-account";

export default extension("customer-account.order-index.block.render", (root) => {
  const card = root.createComponent(Card, { padding: true });
  const blockStack = root.createComponent(BlockStack, { spacing: "loose" });

  const headerStack = root.createComponent(InlineLayout, {
    columns: ["fill", "auto"],
    blockAlignment: "center",
  });
  const heading = root.createComponent(Heading, { level: 2 }, "My Saved Carts");
  const cartLink = root.createComponent(Link, { to: "/cart" }, "Go to Cart");
  headerStack.append(heading, cartLink);

  const subtext = root.createComponent(
    Text,
    { appearance: "subdued" },
    "Manage your saved configurations and shareable cart links."
  );

  const divider = root.createComponent(Divider);

  const infoStack = root.createComponent(BlockStack, { spacing: "tight" });
  const infoTitle = root.createComponent(
    Text,
    { size: "medium", emphasis: "bold" },
    "Saved Cart Feature Active"
  );
  const infoDesc = root.createComponent(
    Text,
    { appearance: "subdued" },
    "Save any cart from the cart page or drawer. Restore it anytime with all custom configurations and line item properties preserved."
  );
  infoStack.append(infoTitle, infoDesc);

  const buttonStack = root.createComponent(InlineStack, { inlineAlignment: "start" });
  const button = root.createComponent(
    Button,
    { to: "/cart", kind: "secondary" },
    "View Current Cart"
  );
  buttonStack.append(button);

  blockStack.append(headerStack, subtext, divider, infoStack, buttonStack);
  card.append(blockStack);
  root.append(card);
});
