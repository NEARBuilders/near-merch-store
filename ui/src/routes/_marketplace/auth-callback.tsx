import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

type AuthCallbackSearch = {
  redirect?: string;
};

export const Route = createFileRoute("/_marketplace/auth-callback")({
  validateSearch: (search: Record<string, unknown>): AuthCallbackSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const { data: session } = await authClient.getSession();

    if (!session?.user) {
      throw redirect({ to: "/login" });
    }

    // Use redirect param if provided, otherwise check role
    const user = session.user as { role?: string };
    const defaultRedirect = user.role === "admin" ? "/admin" : "/account";
    const redirectTo = search.redirect || defaultRedirect;

    throw redirect({ to: redirectTo });
  },
  component: () => null,
});
