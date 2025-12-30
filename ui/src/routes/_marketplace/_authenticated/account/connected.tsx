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

    </div>
  );
}
