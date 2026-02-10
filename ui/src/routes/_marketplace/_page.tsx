import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_marketplace/_page")({
  component: PageLayout,
});

function PageLayout() {
  return (
    <div className="w-full pt-32 pb-12 bg-background">
      <div className="container-app mx-auto px-4 md:px-8 lg:px-16">
      <Outlet />
      </div>
    </div>
  );
}
