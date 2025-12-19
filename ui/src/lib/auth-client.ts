import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { siwnClient } from "better-near-auth/client";

// Determine the base URL for authentication
// In development, the host server runs on port 3001
// In production, it's the same origin as the UI
const getAuthBaseURL = () => {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  
  // If we're on localhost:3002 (UI dev server), point to host on 3001
  if (window.location.port === '3002') {
    return 'http://localhost:3001';
  }
  
  // Otherwise use the same origin (production or host server)
  return window.location.origin;
};

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
  plugins: [
    siwnClient({
      recipient: process.env.PUBLIC_ACCOUNT_ID || "near-merch-store.near",
      networkId: "mainnet",
    }),
    adminClient(),
  ],
});
