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

  const handleNearAction = async () => {
    setIsProcessingNear(true);
    try {
      if (!accountId) {
        await authClient.requestSignIn.near(
          { recipient: process.env.PUBLIC_ACCOUNT_ID || "every.near", },
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
          { recipient: process.env.PUBLIC_ACCOUNT_ID || "every.near", },
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
              className={`p-4 flex items-center justify-between ${account === primaryAccount
                ? "bg-[#d4fced] dark:bg-emerald-950/30 border border-[#00ec97] dark:border-emerald-900"
                : "bg-card border border-border"
                }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`size-10 flex items-center justify-center ${account.providerId === "siwn"
                    ? "bg-[#00ec97]"
                    : account.providerId === "github"
                      ? "bg-[#030213] dark:bg-white"
                      : ""
                    }`}
                >
                  {account.providerId === "siwn" && (
                    <svg className="size-5" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="black" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm">NEAR</p>
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

      <div className="border-t border-[rgba(0,0,0,0.1)] dark:border-white/10 pt-4">
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
              className="bg-[#030213] dark:bg-white dark:text-black hover:bg-[#1a1a2e] dark:hover:bg-gray-200 text-white text-xs h-8 px-4 disabled:opacity-50"
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
      </div>

      <div className="bg-[#ececf0] dark:bg-muted p-4 mt-6">
        <p className="text-xs text-[#717182]">
          💡 Connect multiple accounts for flexible sign-in options. You can
          disconnect at any time from this page.
        </p>
      </div>
    </div>
  );
}
