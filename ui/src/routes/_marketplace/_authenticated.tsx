import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_marketplace/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    let session = context.session as { user?: unknown } | null | undefined;

    // In SSR we rely on the host-provided request session via router context.
    // On the client we can fall back to an API call if context.session is missing.
    if (!session?.user && typeof window !== "undefined") {
      const res = await authClient.getSession();
      session = res.data ?? null;
    }

    if (!session?.user) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.pathname,
        },
      });
    }
    return { session };
  },
  component: () => <Outlet />,
});
