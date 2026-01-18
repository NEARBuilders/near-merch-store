import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_marketplace/_authenticated/_admin/dashboard/users")({
  component: UsersManagement,
});

function UsersManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Users</h2>
        <p className="text-sm text-foreground/90 dark:text-muted-foreground">
          Manage user accounts and permissions
        </p>
      </div>
      <div className="rounded-2xl bg-background border border-border/60 p-12 text-center">
        <Users className="size-12 mx-auto mb-4 text-foreground/50 dark:text-muted-foreground" />
        <p className="text-foreground/90 dark:text-muted-foreground font-medium">User management coming soon</p>
      </div>
    </div>
  );
}
