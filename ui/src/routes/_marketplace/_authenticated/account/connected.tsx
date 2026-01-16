import { authClient } from '@/lib/auth-client';
import { queryClient } from '@/utils/orpc';
import { createFileRoute } from '@tanstack/react-router';
import { Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export const Route = createFileRoute(
  "/_marketplace/_authenticated/account/connected"
)({
  component: ConnectedAccountsPage,
});

function ConnectedAccountsPage() {
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
    <div className="space-y-6">
          <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Connected Accounts</h2>
        <p className="text-sm text-foreground/90 dark:text-muted-foreground">
              Manage your linked authentication providers
            </p>
      </div>

      {linkedAccounts.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground/90 dark:text-muted-foreground">Linked Accounts</h3>
          <div className="space-y-3">
          {linkedAccounts.map((account) => (
            <div
              key={account.providerId || account.accountId}
                className={`rounded-lg p-4 flex items-center justify-between border transition-colors ${
                  account === primaryAccount
                    ? "bg-[#00EC97]/10 dark:bg-[#00EC97]/20 border-[#00EC97]/60"
                    : "bg-background/60 backdrop-blur-sm border-border/60"
                }`}
            >
              <div className="flex items-center gap-3">
                <div
                    className={`size-10 flex items-center justify-center rounded-lg ${
                      account.providerId === "siwn"
                        ? "bg-[#00EC97]"
                    : account.providerId === "github"
                      ? "bg-[#030213] dark:bg-white"
                          : "bg-muted"
                    }`}
                >
                  {account.providerId === "siwn" && (
                    <svg className="size-5" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="black" />
                    </svg>
                  )}
                </div>
                <div>
                    <p className="text-sm font-medium">NEAR</p>
                    <p className="text-xs text-foreground/70 dark:text-muted-foreground">
                    {account.accountId?.split(":")[0] || account.accountId}
                  </p>
                </div>
              </div>
              {account === primaryAccount ? (
                <svg
                    className="size-5 text-[#00EC97]"
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
                    className="text-red-500 hover:text-red-600 text-sm disabled:opacity-50 transition-colors"
                >
                  {isUnlinking === (account.providerId || account.accountId)
                    ? "Unlinking..."
                    : "Unlink"}
                </button>
              ) : null}
            </div>
          ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 p-12 text-center">
          <Link2 className="mx-auto h-12 w-12 text-foreground/50 dark:text-muted-foreground mb-4" />
          <p className="text-foreground/90 dark:text-muted-foreground font-medium mb-1">No linked accounts</p>
          <p className="text-sm text-foreground/70 dark:text-muted-foreground">Your linked accounts will appear here</p>
        </div>
      )}

    </div>
  );
}
