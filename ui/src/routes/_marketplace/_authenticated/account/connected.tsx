import { ProfileLine } from '@/components/profile-line';
import { authClient } from '@/lib/auth-client';
import { queryClient } from '@/utils/orpc';
import { createFileRoute } from '@tanstack/react-router';
import { Link2 } from 'lucide-react';
import { Social } from 'near-social-js';
import { useEffect, useState } from 'react';

export const Route = createFileRoute(
  "/_marketplace/_authenticated/account/connected"
)({
  component: ConnectedAccountsPage,
  loader: async () => {
    const accountId = authClient.near.getAccountId();

    if (!accountId) {
      return { accountId: null, profile: null };
    }

    try {
      const social = new Social({ network: "mainnet" });
      const profile = await social.getProfile(accountId);
      return { accountId, profile };
    } catch (error) {
      return { accountId, profile: null };
    }
  },
});

function ConnectedAccountsPage() {
  const { accountId, profile } = Route.useLoaderData();
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isLinkingGitHub, setIsLinkingGitHub] = useState(false);
  const [isProcessingNear, setIsProcessingNear] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState<string | null>(null);

  useEffect(() => {
    refreshAccounts();
  }, []);

  const refreshAccounts = async () => {
    try {
      const response = await authClient.listAccounts();
      const accounts = Array.isArray(response.data) ? response.data : [];
      setLinkedAccounts(accounts);
      queryClient.invalidateQueries();
    } catch (err) {
      console.error("Failed to fetch linked accounts:", err);
      setLinkedAccounts([]);
    }
  };

  const handleLinkSocial = async (providerId: "google" | "github") => {
    if (providerId === "google") setIsLinkingGoogle(true);
    else setIsLinkingGitHub(true);

    try {
      await authClient.linkSocial({
        provider: providerId,
        callbackURL: window.location.href,
      });
    } catch (error) {
      console.error(`Failed to link ${providerId}:`, error);
      if (providerId === "google") setIsLinkingGoogle(false);
      else setIsLinkingGitHub(false);
    }
  };

  const handleNearAction = async () => {
    setIsProcessingNear(true);
    try {
      if (!accountId) {
        await authClient.requestSignIn.near(
          { recipient: "marketplace-demo.near" },
          {
            onSuccess: () => {
              setIsProcessingNear(false);
            },
            onError: async (error: any) => {
              setIsProcessingNear(false);
              console.error("Wallet connection failed:", error);
              console.error(error.message || "Failed to connect wallet");
            },
          }
        );
      } else {
        await authClient.near.link(
          { recipient: "marketplace-demo.near" },
          {
            onSuccess: () => {
              console.log("NEAR account linked successfully");
              refreshAccounts();
              setIsProcessingNear(false);
            },
            onError: async (error: any) => {
              console.error("NEAR link error:", error);
              console.error(error.message || "Failed to link NEAR account");
              setIsProcessingNear(false);
              await authClient.near.disconnect();
            },
          }
        );
      }
    } catch (error) {
      setIsProcessingNear(false);
      console.log("Failed to process NEAR action");
    }
  };

  const handleUnlinkAccount = async (account: any) => {
    setIsUnlinking(account.providerId || account.accountId);
    try {
      if (account.providerId === "siwn") {
        const [accountId, network] = account.accountId.split(":");
        await authClient.near.unlink({
          accountId,
          network: (network as "mainnet" | "testnet") || "mainnet",
        });
      } else {
        await authClient.unlinkAccount({ providerId: account.providerId });
      }
      console.log("Account unlinked successfully");
      refreshAccounts();
    } catch (error) {
      console.error("Failed to unlink account:", error);
      console.log("Failed to unlink account");
    } finally {
      setIsUnlinking(null);
    }
  };

  const isProviderLinked = (providerId: string) =>
    Array.isArray(linkedAccounts) &&
    linkedAccounts.some((a) => a.providerId === providerId);
  const primaryAccount = Array.isArray(linkedAccounts)
    ? linkedAccounts.find((acc) => acc.providerId === "siwn") ||
      linkedAccounts[0]
    : null;

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-2">
          <Link2 className="size-5 mt-0.5" />
          <div>
            <h2 className="text-lg font-medium mb-1">Connected Accounts</h2>
            <p className="text-sm text-[#717182]">
              Manage your linked authentication providers
            </p>
          </div>
        </div>
      </div>

      {accountId && <ProfileLine accountId={accountId} profile={profile} />}

      {linkedAccounts.length > 0 && (
        <div className="border-t border-[rgba(0,0,0,0.1)] pt-4 space-y-3">
          <p className="text-sm text-[#717182] mb-2">Linked Accounts</p>
          {linkedAccounts.map((account) => (
            <div
              key={account.providerId || account.accountId}
              className={`p-4 flex items-center justify-between ${
                account === primaryAccount
                  ? "bg-[#d4fced] border border-[#00ec97]"
                  : "bg-card border border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`size-10 flex items-center justify-center ${
                    account.providerId === "siwn"
                      ? "bg-[#00ec97]"
                      : account.providerId === "github"
                      ? "bg-[#030213]"
                      : ""
                  }`}
                >
                  {account.providerId === "siwn" && (
                    <svg className="size-5" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="black" />
                    </svg>
                  )}
                  {account.providerId === "google" && (
                    <svg className="size-6" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  {account.providerId === "github" && (
                    <svg
                      className="size-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm">
                    {account.providerId === "siwn"
                      ? "NEAR"
                      : account.providerId === "google"
                      ? "Google"
                      : "GitHub"}
                  </p>
                  <p className="text-xs text-[#717182]">
                    {account.accountId?.split(":")[0] || account.accountId}
                  </p>
                </div>
              </div>
              {account === primaryAccount ? (
                <svg
                  className="size-5 text-[#00ec97]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : linkedAccounts.length > 1 ? (
                <button
                  onClick={() => handleUnlinkAccount(account)}
                  disabled={
                    isUnlinking === (account.providerId || account.accountId)
                  }
                  className="text-red-500 hover:text-red-600 text-sm disabled:opacity-50"
                >
                  {isUnlinking === (account.providerId || account.accountId)
                    ? "Unlinking..."
                    : "Unlink"}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-[rgba(0,0,0,0.1)] pt-4">
        <p className="text-sm text-[#717182] mb-4">Add New Account</p>

        {!isProviderLinked("siwn") && (
          <div className="bg-card border border-border mb-3 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#00ec97] size-10 flex items-center justify-center">
                <svg className="size-5" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="black" />
                </svg>
              </div>
              <div>
                <p className="text-sm">Link NEAR Account</p>
                {accountId && (
                  <p className="text-xs text-[#717182]">{accountId}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleNearAction}
              disabled={isProcessingNear}
              className="bg-[#030213] hover:bg-[#1a1a2e] text-white text-xs h-8 px-4 disabled:opacity-50"
            >
              {isProcessingNear
                ? accountId
                  ? "Linking..."
                  : "Connecting..."
                : accountId
                ? "Link"
                : "Connect"}
            </button>
          </div>
        )}

        {!isProviderLinked("google") && (
          <div className="bg-card border border-border mb-3 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 flex items-center justify-center">
                <svg className="size-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>
              <p className="text-sm">Link Google Account</p>
            </div>
            <button
              onClick={() => handleLinkSocial("google")}
              disabled={isLinkingGoogle}
              className="bg-[#030213] hover:bg-[#1a1a2e] text-white text-xs h-8 px-4 disabled:opacity-50"
            >
              {isLinkingGoogle ? "Linking..." : "Connect"}
            </button>
          </div>
        )}

        {!isProviderLinked("github") && (
          <div className="bg-card border border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#030213] size-10 flex items-center justify-center">
                <svg
                  className="size-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-sm">Link GitHub Account</p>
            </div>
            <button
              onClick={() => handleLinkSocial("github")}
              disabled={isLinkingGitHub}
              className="bg-[#030213] hover:bg-[#1a1a2e] text-white text-xs h-8 px-4 disabled:opacity-50"
            >
              {isLinkingGitHub ? "Linking..." : "Connect"}
            </button>
          </div>
        )}
      </div>

      <div className="bg-[#ececf0] p-4 mt-6">
        <p className="text-xs text-[#717182]">
          💡 Connect multiple accounts for flexible sign-in options. You can
          disconnect at any time from this page.
        </p>
      </div>
    </div>
  );
}
