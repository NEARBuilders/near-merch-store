import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_marketplace/_page/refunds-returns")({
  component: RefundsReturns,
});

function RefundsReturns() {
  return (
    <>
      <h1 className="text-base font-normal mb-2">Refunds &amp; Returns</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: January 12, 2026
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Eligibility</h2>
        <p className="text-muted-foreground mb-4">
          Refunds or replacements may be issued for products that are misprinted, damaged, 
          defective, or lost in transit. Claims must be submitted to NEAR Foundation within 
          30 days of product receipt, or within 30 days of the estimated delivery date for 
          shipments lost in transit.
        </p>
        <p className="text-muted-foreground mb-4">
          Claims submitted outside these timeframes may not be eligible for a refund or replacement.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Fulfillment &amp; Processing</h2>
        <p className="text-muted-foreground mb-4">
          All products are fulfilled by a third-party fulfillment partner. Where a refund is 
          approved due to a fulfillment issue, the fulfillment partner processes the refund to 
          NEAR Foundation as the merchant of record. NEAR Foundation then issues the refund to 
          the customer.
        </p>
        <p className="text-muted-foreground mb-4">
          Refunds are not automatically processed via the original payment processor.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Non-Refundable Scenarios</h2>
        <p className="text-muted-foreground mb-4">
          Returns due to buyer's remorse, size exchanges, or incorrect address details are not 
          refundable, except where required by applicable law.
        </p>
        <p className="text-muted-foreground mb-4">
          Certain items, including but not limited to hygiene-sensitive or customized products, 
          may not be eligible for return or refund.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Refund Methods</h2>
        <p className="text-muted-foreground mb-4">
          Approved refunds may be issued in fiat currency or in a supported digital asset, at 
          NEAR Foundation's discretion and subject to operational feasibility.
        </p>
        <p className="text-muted-foreground mb-4">
          Refunds are issued based on the fiat value at the time the refund is processed. Due to 
          market volatility and transaction mechanics, the refunded amount may differ from the 
          original purchase amount.
        </p>
        <p className="text-muted-foreground mb-4">
          Network fees, processing fees, and exchange fees are non-refundable.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Additional Terms</h2>
        <p className="text-muted-foreground mb-4">
          Where applicable, customers may be asked to confirm their preferred refund method. 
          Additional terms or limitations may apply and will be communicated during the refund 
          process.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">How to Submit a Claim</h2>
        <p className="text-muted-foreground mb-4">
          To submit a refund or replacement claim, please contact us at{" "}
          <a
            href="mailto:merch@near.foundation"
            className="text-primary hover:underline"
          >
            merch@near.foundation
          </a>{" "}
          with the following information:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
          <li>Your order number</li>
          <li>Description of the issue</li>
          <li>Photos of the defective or damaged item (if applicable)</li>
          <li>Your preferred resolution (refund or replacement)</li>
        </ul>
      </section>

      <hr className="border-t border-border my-6" />

      <p className="text-muted-foreground">
        For questions about refunds or returns, contact us at{" "}
        <a
          href="mailto:merch@near.foundation"
          className="text-primary hover:underline"
        >
          merch@near.foundation
        </a>
        . For our complete terms, see our{" "}
        <Link to="/terms-of-service" className="text-primary hover:underline">
          Terms of Service
        </Link>
        .
      </p>
    </>
  );
}
