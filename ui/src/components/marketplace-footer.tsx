import { Link } from "@tanstack/react-router";
import { NearWordmark } from "@/components/near-wordmark";
import { BuiltOnNear } from "@/components/built-on-near";

export function MarketplaceFooter() {
  return (
    <footer className="bg-background border-t border-border text-foreground section-padding">
      <div className="container-app">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-6">
            <a
              aria-label="NEAR.org"
              className="block w-full max-w-[240px] mx-auto md:mx-0"
              href="/"
            >
              <NearWordmark className="text-foreground" />
            </a>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Shop</h4>
            <div className="space-y-4 mt-4">
              <Link
                to="/"
                className="block link-primary text-sm"
              >
                All Products
              </Link>

              <Link
                to="/dashboard"
                className="block link-primary text-sm"
              >
                Admin Dashboard
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Support</h4>
            <div className="space-y-4 mt-4">
              <a
                href="mailto:merch@near.foundation"
                className="block link-muted text-sm"
              >
                Contact Us
              </a>
              <Link
                to="/faq"
                className="block link-muted text-sm"
              >
                FAQ
              </Link>
              <Link
                to="/refunds-returns"
                className="block link-muted text-sm"
              >
                Refunds &amp; Returns
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Connect</h4>
            <div className="space-y-4 mt-4">
              <a
                href="https://github.com/nearbuilders/near-merch-store"
                target="_blank"
                rel="noopener noreferrer"
                className="block link-muted text-sm"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left text-muted-foreground/60 text-sm">
            © {new Date().getFullYear()} NEAR Protocol. All rights reserved.
          </div>
          <div className="flex items-center justify-center gap-6">
            <Link
              to="/privacy-policy"
              className="link-muted text-sm"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms-of-service"
              className="link-muted text-sm"
            >
              Terms of Service
            </Link>
            <Link
              to="/cookie-policy"
              className="link-muted text-sm"
            >
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
