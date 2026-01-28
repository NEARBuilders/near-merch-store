import { Link } from "@tanstack/react-router";
import { NearWordmark } from "@/components/near-wordmark";
import { BuiltOnNear } from "@/components/built-on-near";

export function MarketplaceFooter() {
  return (
    <footer className="text-foreground section-padding bg-background">
      <div className="container-app mx-auto px-4 md:px-8 lg:px-16">
        <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-6 md:px-8 lg:px-10 py-8 md:py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {/* Logo - left side on mobile, blakus Connect */}
          <div className="space-y-6 md:col-span-1">
            <a
              aria-label="NEAR.org"
              className="block w-full max-w-[140px] mx-auto md:mx-0"
              href="/"
            >
              <NearWordmark className="text-foreground w-full h-auto" />
            </a>
          </div>

          {/* Connect - right side on mobile, blakus Logo */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Connect</h4>
            <div className="space-y-4 mt-4">
              <a
                href="https://x.com/nearmerch"
                target="_blank"
                rel="noopener noreferrer"
                className="block link-muted text-sm"
              >
                Near Merch on X
              </a>
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

          {/* Shop - second row on mobile */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Shop</h4>
            <div className="space-y-4 mt-4">
              <Link
                to="/products"
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

          {/* Support - second row on mobile */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Support</h4>
            <div className="space-y-4 mt-4">
              <a
                href="mailto:merch@near.foundation"
                className="block link-muted text-sm"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  window.open('mailto:merch@near.foundation', '_blank', 'noopener,noreferrer');
                }}
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
        </div>

          <div className="border-t border-border/60 mt-8 md:mt-10 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left text-foreground/90 dark:text-muted-foreground/60 text-sm">
            © {new Date().getFullYear()} NEAR Protocol. All rights reserved.
          </div>
          <div className="flex items-center justify-center gap-6">
            <Link
              to="/privacy-policy"
                className="link-muted text-sm hover:text-[#00EC97] transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms-of-service"
                className="link-muted text-sm hover:text-[#00EC97] transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/cookie-policy"
                className="link-muted text-sm hover:text-[#00EC97] transition-colors"
            >
              Cookie Policy
            </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
