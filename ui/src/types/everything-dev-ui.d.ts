import "everything-dev/ui/types";

declare module "everything-dev/ui/types" {
  interface RouterContext {
    session?: unknown;
    nearAccountId?: string | null;
  }

  interface RenderOptions {
    session?: unknown;
    nearAccountId?: string | null;
  }
}
