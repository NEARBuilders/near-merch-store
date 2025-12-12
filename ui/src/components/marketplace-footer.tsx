import { Link } from "@tanstack/react-router";
import { COLLECTIONS } from "@/integrations/marketplace-api";
import logoFull from "@/assets/logo_full.png";

export function MarketplaceFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 text-black py-16">
      <div className="max-w-[1408px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img
                src={logoFull}
                alt="NEAR Store"
                className="h-8 w-auto object-contain"
              />
            </div>
            <p className="text-black/60 text-sm">
              Building the future of blockchain technology, one block at a time.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-black">Shop</h4>
            <div className="space-y-4 mt-4">
              {COLLECTIONS.map((c: string) => (
                <Link
                  key={c}
                  to="/collections/$collection"
                  params={{ collection: c.toLowerCase() }}
                  className="block text-black/60 hover:text-[#00ec97] transition-colors text-sm"
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-black">Support</h4>
            <div className="space-y-4 mt-4">
              <a
                href="#"
                className="block text-black/60 hover:text-black transition-colors text-sm"
              >
                Contact Us
              </a>
              <a
                href="#"
                className="block text-black/60 hover:text-black transition-colors text-sm"
              >
                Shipping Info
              </a>
              <a
                href="#"
                className="block text-black/60 hover:text-black transition-colors text-sm"
              >
                Returns
              </a>
              <a
                href="#"
                className="block text-black/60 hover:text-black transition-colors text-sm"
              >
                FAQ
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-black">Connect</h4>
            <div className="space-y-4 mt-4">
              <a
                href="#"
                className="block text-black/60 hover:text-black transition-colors text-sm"
              >
                Twitter
              </a>
              <a
                href="#"
                className="block text-black/60 hover:text-black transition-colors text-sm"
              >
                Discord
              </a>
              <a
                href="#"
                className="block text-black/60 hover:text-black transition-colors text-sm"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center text-black/40 text-sm ">
            © {new Date().getFullYear()} NEAR Protocol. All rights reserved.
          </div>
          <div className="flex items-center justify-center gap-6">
            <a
              href="#"
              className="text-black/60 hover:text-black transition-colors text-sm"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-black/60 hover:text-black transition-colors text-sm"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
