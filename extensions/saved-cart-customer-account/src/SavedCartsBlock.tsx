import {
  reactExtension,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Link,
  Heading,
  Divider,
} from "@shopify/ui-extensions-react/customer-account";

export default reactExtension("customer-account.order-index.block.render", () => (
  <SavedCartsBlock />
));

function SavedCartsBlock() {
  return (
    <Card padding>
      <BlockStack spacing="loose">
        <InlineStack inlineAlignment="space-between" blockAlignment="center">
          <Heading level={2}>My Saved Carts</Heading>
          <Link to="/cart">Go to Cart</Link>
        </InlineStack>

        <Text appearance="subdued">
          Manage your saved configurations and shareable cart links.
        </Text>

        <Divider />

        <BlockStack spacing="tight">
          <Text size="medium" emphasis="bold">
            Saved Cart Feature Active
          </Text>
          <Text appearance="subdued">
            Save any cart from the cart page or drawer. Restore it anytime with all custom configurations and line item properties preserved.
          </Text>
        </BlockStack>

        <InlineStack inlineAlignment="start">
          <Button to="/cart" kind="secondary">
            View Current Cart
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
