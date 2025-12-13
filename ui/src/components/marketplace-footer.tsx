import { Link } from "@tanstack/react-router";
import { COLLECTIONS } from "@/integrations/marketplace-api";
import logoFull from "@/assets/logo_full.png";

export function MarketplaceFooter() {
  return (
    <footer className="bg-background border-t border-border text-foreground py-16">
      <div className="max-w-[1408px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img
                src={logoFull}
                alt="NEAR Store"
                className="h-8 w-auto object-contain dark:invert"
              />
            </div>
            <p className="text-muted-foreground text-sm">
              Building the future of blockchain technology, one block at a time.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Shop</h4>
            <div className="space-y-4 mt-4">
              {COLLECTIONS.map((c: string) => (
                <Link
                  key={c}
                  to="/collections/$collection"
                  params={{ collection: c.toLowerCase() }}
                  className="block text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Support</h4>
            <div className="space-y-4 mt-4">
              <a
                href="#"
                className="block text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Contact Us
              </a>
              <a
                href="#"
                className="block text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Shipping Info
              </a>
              <a
                href="#"
                className="block text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Returns
              </a>
              <a
                href="#"
                className="block text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                FAQ
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Connect</h4>
            <div className="space-y-4 mt-4">
              <a
                href="#"
                className="block text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Twitter
              </a>
              <a
                href="#"
                className="block text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Discord
              </a>
              <a
                href="#"
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
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
