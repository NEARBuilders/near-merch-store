import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_marketplace/_admin")({
  beforeLoad: async ({ location }) => {
    const { data: session } = await authClient.getSession();

    // Check if user is authenticated
    if (!session?.user) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.pathname,
        },
      });
    }

    // Check if user has admin role
    const user = session.user as { role?: string };
    if (user.role !== "admin") {
      throw redirect({
        to: "/",
      });
    }

    return { session };
  },
  component: () => <Outlet />,
});
