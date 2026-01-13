import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_marketplace/_page/privacy-policy")({
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <>
      <h1 className="text-base font-normal mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: January 12, 2026
      </p>

      <p className="text-muted-foreground mb-6">
        NEAR Foundation ("we", "us", "our") is committed to protecting your privacy. This 
        Privacy Policy describes how we collect, use, and share information when you use our 
        merch store.
      </p>

      <p className="text-muted-foreground mb-6">
        This policy applies specifically to the NEAR Merch Store. For NEAR's general privacy 
        practices, please also review the{" "}
        <a
          href="https://near.org/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          NEAR Privacy Policy
        </a>
        .
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
        
        <h3 className="text-lg font-medium mt-6 mb-3">Information You Provide</h3>
        <p className="text-muted-foreground mb-4">
          When you place an order, we collect:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
          <li>Name (first and last)</li>
          <li>Email address</li>
          <li>Shipping address (street, city, state/province, postal code, country)</li>
          <li>Phone number (optional, for delivery purposes)</li>
          <li>Tax ID (required for certain countries, e.g., Brazil)</li>
        </ul>

        <h3 className="text-lg font-medium mt-6 mb-3">Account Information</h3>
        <p className="text-muted-foreground mb-4">
          When you sign in with your NEAR wallet, we collect:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
          <li>NEAR account ID (wallet address)</li>
          <li>Public key associated with your account</li>
          <li>Network (mainnet/testnet)</li>
        </ul>
        <p className="text-muted-foreground mb-4">
          Note: NEAR wallet addresses are public on the blockchain by nature.
        </p>

        <h3 className="text-lg font-medium mt-6 mb-3">Order Information</h3>
        <p className="text-muted-foreground mb-4">
          We store details about your orders, including:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
          <li>Products purchased and quantities</li>
          <li>Order total and currency</li>
          <li>Order status and tracking information</li>
          <li>Delivery estimates</li>
        </ul>

        <h3 className="text-lg font-medium mt-6 mb-3">Technical Information</h3>
        <p className="text-muted-foreground mb-4">
          We automatically collect certain technical information, including:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
          <li>IP address</li>
          <li>Browser type and user agent</li>
          <li>Session information</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">2. How We Use Your Information</h2>
        <p className="text-muted-foreground mb-4">
          We use your information to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
          <li>Process and fulfill your orders</li>
          <li>Communicate with you about your orders (shipping updates, delivery confirmations)</li>
          <li>Provide customer support</li>
          <li>Process refunds and handle returns</li>
          <li>Comply with legal obligations (tax reporting, fraud prevention)</li>
          <li>Improve our services</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">3. Information Sharing</h2>
        <p className="text-muted-foreground mb-4">
          We share your information with the following third parties to fulfill orders:
        </p>

        <h3 className="text-lg font-medium mt-6 mb-3">Fulfillment Partners</h3>
        <p className="text-muted-foreground mb-4">
          We work with print-on-demand fulfillment partners (such as Printful and Gelato) who 
          produce and ship your orders. We share your shipping address and order details with 
          these partners to fulfill your orders.
        </p>

        <h3 className="text-lg font-medium mt-6 mb-3">Payment Processors</h3>
        <p className="text-muted-foreground mb-4">
          We use third-party payment processors (such as Stripe and Pingpay) to process 
          payments. Your payment information is handled directly by these processors according 
          to their privacy policies.
        </p>

        <h3 className="text-lg font-medium mt-6 mb-3">Shipping Carriers</h3>
        <p className="text-muted-foreground mb-4">
          Your shipping information is shared with carriers to deliver your orders.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">4. Data Storage and Retention</h2>
        <p className="text-muted-foreground mb-4">
          We retain your order information for as long as necessary to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
          <li>Provide customer support for your orders</li>
          <li>Comply with legal and tax requirements</li>
          <li>Resolve disputes and enforce our agreements</li>
        </ul>
        <p className="text-muted-foreground mb-4">
          Account information is retained while your account is active. You may request 
          deletion of your account by contacting us.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">5. Your Rights</h2>
        <p className="text-muted-foreground mb-4">
          Depending on your location, you may have certain rights regarding your personal 
          information, including:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
          <li>Access to your personal data</li>
          <li>Correction of inaccurate data</li>
          <li>Deletion of your data (subject to legal retention requirements)</li>
          <li>Data portability</li>
          <li>Objection to processing</li>
        </ul>
        <p className="text-muted-foreground mb-4">
          To exercise these rights, contact us at{" "}
          <a
            href="mailto:merch@near.foundation"
            className="text-primary hover:underline"
          >
            merch@near.foundation
          </a>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">6. Cookies and Local Storage</h2>
        <p className="text-muted-foreground mb-4">
          We use cookies and browser local storage for authentication and functionality. 
          For detailed information, see our{" "}
          <Link to="/cookie-policy" className="text-primary hover:underline">
            Cookie Policy
          </Link>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">7. Security</h2>
        <p className="text-muted-foreground mb-4">
          We implement appropriate technical and organizational measures to protect your 
          information. However, no method of transmission over the Internet is 100% secure.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">8. Children's Privacy</h2>
        <p className="text-muted-foreground mb-4">
          Our store is not intended for children under 18 years of age. We do not knowingly 
          collect personal information from children under 18.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">9. Changes to This Policy</h2>
        <p className="text-muted-foreground mb-4">
          We may update this Privacy Policy from time to time. We will notify you of any 
          material changes by posting the new policy on this page with an updated "Last 
          updated" date.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">10. Contact Us</h2>
        <p className="text-muted-foreground mb-4">
          For questions about this Privacy Policy or to exercise your privacy rights, 
          contact us at:
        </p>
        <ul className="list-none space-y-2 text-muted-foreground mb-4">
          <li>
            General inquiries:{" "}
            <a
              href="mailto:merch@near.foundation"
              className="text-primary hover:underline"
            >
              merch@near.foundation
            </a>
          </li>
          <li>
            Legal inquiries:{" "}
            <a
              href="mailto:legal@near.org"
              className="text-primary hover:underline"
            >
              legal@near.org
            </a>
          </li>
        </ul>
      </section>

      <hr className="border-t border-border my-6" />

      <p className="text-muted-foreground">
        See also: NEAR's general{" "}
        <a
          href="https://near.org/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Privacy Policy
        </a>
      </p>
    </>
  );
}
