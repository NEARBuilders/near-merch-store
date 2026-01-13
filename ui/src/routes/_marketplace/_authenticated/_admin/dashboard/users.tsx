import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_marketplace/_authenticated/_admin/dashboard/users")({
  component: UsersManagement,
});

function UsersManagement() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium">Users</h2>
      </div>
      <div className="bg-[#ececf0] dark:bg-muted p-8 text-center">
        <Users className="size-8 mx-auto mb-4 text-[#717182]" />
        <p className="text-[#717182]">User management coming soon</p>
      </div>
    </div>
  );
}
