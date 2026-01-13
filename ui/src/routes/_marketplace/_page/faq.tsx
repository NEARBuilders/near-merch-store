import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_marketplace/_page/faq")({
  component: FAQ,
});

function FAQ() {
  return (
    <>
      <h1 className="text-base font-normal mb-2">Frequently Asked Questions</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Find answers to common questions about ordering, shipping, payments, and more.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Ordering &amp; Products</h2>

        <div className="space-y-4">
          <div>
            <p className="font-medium mb-1">What products do you offer?</p>
            <p className="text-muted-foreground">
              Our merch store offers made-to-order items produced and shipped by a third-party 
              fulfillment partner. Each product is created specifically for your order.
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">Are products made to order?</p>
            <p className="text-muted-foreground">
              Yes. All items are produced on demand, which helps reduce waste. Because of this, 
              we generally don't accept returns for buyer's remorse or size changes (see our{" "}
              <Link to="/refunds-returns" className="underline hover:text-foreground">
                Refunds &amp; Returns policy
              </Link>
              ).
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">How do I choose the right size?</p>
            <p className="text-muted-foreground">
              Please refer to the size guide available on each product page before placing your 
              order. If you're unsure, we recommend sizing up, as size exchanges are generally 
              not offered.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Shipping &amp; Delivery</h2>

        <div className="space-y-4">
          <div>
            <p className="font-medium mb-1">Where do you ship from?</p>
            <p className="text-muted-foreground">
              Products are fulfilled and shipped by our fulfillment partner from their nearest 
              available facility, depending on your location.
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">How long does shipping take?</p>
            <p className="text-muted-foreground">
              Production and shipping times vary by product and destination. Estimated delivery 
              times are shown at checkout, but delays may occur due to customs, carrier issues, 
              or peak periods.
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">
              What if my package is marked as delivered but I didn't receive it?
            </p>
            <p className="text-muted-foreground">
              We recommend checking with the carrier and neighbors first. If the package is 
              confirmed lost, please contact us within 30 days of the estimated delivery date 
              so we can investigate.
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">What if I entered the wrong shipping address?</p>
            <p className="text-muted-foreground">
              If an incorrect or insufficient address is provided, the shipment may be returned 
              or lost. In these cases, reshipment costs may apply, and refunds are not guaranteed.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Payments</h2>

        <div className="space-y-4">
          <div>
            <p className="font-medium mb-1">What payment methods are supported?</p>
            <p className="text-muted-foreground">
              We support payments via traditional methods and supported digital assets 
              (including stablecoins and native tokens), depending on availability at checkout.
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">Can I pay with crypto?</p>
            <p className="text-muted-foreground">
              Yes, crypto payments are supported via our payment provider. Available tokens 
              may vary based on configuration and region.
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">Are prices shown in fiat or crypto?</p>
            <p className="text-muted-foreground">
              Prices are displayed in fiat currency. If you choose to pay with crypto, the 
              final amount is converted at checkout based on the applicable exchange rate.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Returns &amp; Refunds</h2>

        <div className="space-y-4">
          <div>
            <p className="font-medium mb-1">What is your refund policy?</p>
            <p className="text-muted-foreground">
              If your item arrives damaged, defective, incorrect, or does not arrive, you may 
              be eligible for a refund or replacement. Please contact us within 30 days of 
              receiving your order (or within 30 days of the estimated delivery date for lost 
              shipments). See our full{" "}
              <Link to="/refunds-returns" className="underline hover:text-foreground">
                Refunds &amp; Returns policy
              </Link>{" "}
              for details.
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">
              Do you accept returns for buyer's remorse or size exchanges?
            </p>
            <p className="text-muted-foreground">
              No. Returns for buyer's remorse, size exchanges, or change of mind are generally 
              not accepted, except where required by law.
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">How do refunds work if I paid with crypto?</p>
            <p className="text-muted-foreground">
              Approved refunds are processed by NEAR Foundation as the merchant. Refunds may 
              be issued in fiat currency or a supported digital asset, depending on operational 
              feasibility. Refund amounts are based on the value at the time the refund is 
              processed and may differ from the original purchase amount due to market 
              fluctuations. Network and processing fees are non-refundable.
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">How long does a refund take?</p>
            <p className="text-muted-foreground">
              Refund timing depends on the refund method used. Fiat refunds may take several 
              business days, while crypto refunds depend on blockchain confirmation times.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Legal &amp; Policies</h2>

        <div className="space-y-4">
          <div>
            <p className="font-medium mb-1">
              Where can I find your Terms of Service and Privacy Policy?
            </p>
            <p className="text-muted-foreground">
              Links to our{" "}
              <Link to="/terms-of-service" className="underline hover:text-foreground">
                Terms of Service
              </Link>
              ,{" "}
              <Link to="/privacy-policy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              ,{" "}
              <Link to="/cookie-policy" className="underline hover:text-foreground">
                Cookie Policy
              </Link>
              , and{" "}
              <Link to="/refunds-returns" className="underline hover:text-foreground">
                Refunds &amp; Returns Policy
              </Link>{" "}
              are available in the website footer.
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">Who is the seller of record?</p>
            <p className="text-muted-foreground">
              NEAR Foundation is the merchant of record for all purchases made through this store.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Support</h2>

        <div>
          <p className="font-medium mb-1">How do I contact support?</p>
          <p className="text-muted-foreground">
            If you have questions about your order, shipping, or refunds, please contact us 
            at{" "}
            <a
              href="mailto:merch@near.foundation"
              className="underline hover:text-foreground"
            >
              merch@near.foundation
            </a>
            , including your order number and details of the issue.
          </p>
        </div>
      </section>

      <hr className="border-t border-border my-6" />

      <p className="text-muted-foreground">
        Can't find what you're looking for? Contact us at{" "}
        <a
          href="mailto:merch@near.foundation"
          className="text-primary hover:underline"
        >
          merch@near.foundation
        </a>
      </p>
    </>
  );
}
