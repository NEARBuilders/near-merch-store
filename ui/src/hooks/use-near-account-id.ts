import { authClient } from "@/lib/auth-client";
import { useRouter } from "@tanstack/react-router";

export function useNearAccountId(): string | null {
  const router = useRouter();
  const ssrNearAccountId =
    (router.options.context as { nearAccountId?: string | null }).nearAccountId ??
    null;

  if (typeof window === "undefined") {
    return ssrNearAccountId;
  }

  return authClient.near.getAccountId() ?? ssrNearAccountId;
}
