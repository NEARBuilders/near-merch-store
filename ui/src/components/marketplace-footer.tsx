import { Link } from "@tanstack/react-router";
import { NearWordmark } from "@/components/near-wordmark";

export function MarketplaceFooter() {
  return (
    <footer className="bg-background border-t border-border text-foreground py-16">
      <div className="max-w-[1408px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
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
                className="block text-muted-foreground hover:text-primary transition-colors text-sm"
              >
                All Products
              </Link>

              <Link
                to="/dashboard"
                className="block text-muted-foreground hover:text-primary transition-colors text-sm"
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
                className="block text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Contact Us
              </a>
              <Link
                to="/faq"
                className="block text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                FAQ
              </Link>
              <Link
                to="/refunds-returns"
                className="block text-muted-foreground hover:text-foreground transition-colors text-sm"
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
                className="block text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center text-muted-foreground/60 text-sm ">
            © {new Date().getFullYear()} NEAR Protocol. All rights reserved.
          </div>
          <div className="flex items-center justify-center gap-6">
            <Link
              to="/privacy-policy"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms-of-service"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Terms of Service
            </Link>
            <Link
              to="/cookie-policy"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
