import { createAuthClient } from "better-auth/react";
import { siwnClient } from "better-near-auth/client";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [
    siwnClient({
      domain: "marketplace-demo.near",
      networkId: "mainnet",
    }),
  ],
});
