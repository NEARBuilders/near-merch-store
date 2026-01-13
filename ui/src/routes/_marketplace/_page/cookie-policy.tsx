import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_marketplace/_page/cookie-policy")({
  component: CookiePolicy,
});

function CookiePolicy() {
  return (
    <>
      <h1 className="text-base font-normal mb-2">Cookie Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: January 12, 2026
      </p>

      <p className="text-muted-foreground mb-6">
        This Cookie Policy explains how NEAR Foundation ("we", "us", "our") uses cookies and 
        similar technologies when you visit our merch store. It explains what these technologies 
        are and why we use them, as well as your rights to control our use of them.
      </p>

      <p className="text-muted-foreground mb-6">
        This policy applies in addition to our{" "}
        <Link to="/privacy-policy" className="text-primary hover:underline">
          Privacy Policy
        </Link>
        . For NEAR's general cookie practices, see{" "}
        <a
          href="https://near.org/cookie-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          near.org/cookie-policy
        </a>
        .
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">1. What Are Cookies?</h2>
        <p className="text-muted-foreground mb-4">
          Cookies are small text files that are downloaded onto your computer or mobile device 
          when you visit a website. They enable websites to store information or facilitate 
          access to information stored on your device to enable certain features and distinguish 
          you from other visitors.
        </p>
        <p className="text-muted-foreground mb-4">
          Cookies set by the website operator are called "first-party cookies" and cookies set 
          by parties other than the website operator are called "third-party cookies."
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">2. What Cookies We Use</h2>
        
        <h3 className="text-lg font-medium mt-6 mb-3">Strictly Necessary Cookies</h3>
        <p className="text-muted-foreground mb-4">
          These cookies are essential for our store to function and cannot be switched off. 
          They are set in response to actions made by you, such as logging in or adding items 
          to your cart.
        </p>
        <div className="bg-muted/30 p-4 rounded-lg mb-4">
          <p className="font-medium mb-2">Session Cookie</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
            <li>Purpose: Authentication and session management</li>
            <li>Duration: Session (expires when you close your browser)</li>
            <li>Type: First-party, HttpOnly, Secure</li>
          </ul>
        </div>

        <h3 className="text-lg font-medium mt-6 mb-3">Functional Storage (localStorage)</h3>
        <p className="text-muted-foreground mb-4">
          We use browser localStorage to remember your preferences and provide functionality. 
          This data stays on your device and is not transmitted to our servers.
        </p>
        <div className="space-y-4">
          <div className="bg-muted/30 p-4 rounded-lg">
            <p className="font-medium mb-2">Shopping Cart</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
              <li>Key: <code className="bg-muted px-1 rounded">marketplace-cart</code></li>
              <li>Purpose: Remembers items in your shopping cart</li>
              <li>Data stored: Product IDs, variant IDs, quantities, sizes, colors</li>
              <li>Duration: Persists until you clear your cart or browser data</li>
            </ul>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg">
            <p className="font-medium mb-2">Favorites / Wishlist</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
              <li>Key: <code className="bg-muted px-1 rounded">marketplace-favorites</code></li>
              <li>Purpose: Remembers products you've added to your wishlist</li>
              <li>Data stored: Product IDs</li>
              <li>Duration: Persists until you remove items or clear browser data</li>
            </ul>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg">
            <p className="font-medium mb-2">Theme Preference</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
              <li>Key: <code className="bg-muted px-1 rounded">theme</code></li>
              <li>Purpose: Remembers your light/dark mode preference</li>
              <li>Data stored: "dark" or "light"</li>
              <li>Duration: Persists until you change it or clear browser data</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">3. Third-Party Services</h2>
        <p className="text-muted-foreground mb-4">
          When you complete a purchase, you may interact with third-party payment providers 
          (such as Stripe or Pingpay) which have their own cookie and privacy policies. We 
          encourage you to review their respective policies.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">4. How to Manage Cookies</h2>
        <p className="text-muted-foreground mb-4">
          You can control and manage cookies through your browser settings. Most browsers allow 
          you to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
          <li>View what cookies are stored and delete them individually</li>
          <li>Block third-party cookies</li>
          <li>Block cookies from specific sites</li>
          <li>Block all cookies</li>
          <li>Delete all cookies when you close your browser</li>
        </ul>
        <p className="text-muted-foreground mb-4">
          Please note that if you disable cookies, some features of our store may not function 
          properly. For example, you may not be able to add items to your cart or stay logged in.
        </p>
        <p className="text-muted-foreground mb-4">
          To clear localStorage data, you can use your browser's developer tools or clear all 
          site data through your browser settings.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">5. Updates to This Policy</h2>
        <p className="text-muted-foreground mb-4">
          We may update this Cookie Policy from time to time to reflect changes in our practices 
          or for other operational, legal, or regulatory reasons. Please revisit this page 
          periodically to stay informed.
        </p>
      </section>

      <hr className="border-t border-border my-6" />

      <p className="text-muted-foreground">
        For questions about this Cookie Policy, contact us at{" "}
        <a
          href="mailto:merch@near.foundation"
          className="text-primary hover:underline"
        >
          merch@near.foundation
        </a>
        . For privacy-related inquiries, see our{" "}
        <Link to="/privacy-policy" className="text-primary hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </>
  );
}
