import { Route as RootRoute } from "@/routes/__root";

const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

function resolveAssetUrl(
  assetPath: string | undefined,
  assetsUrl?: string,
): string | undefined {
  if (!assetPath) return undefined;

  if (ABSOLUTE_URL_PATTERN.test(assetPath) || assetPath.startsWith("//")) {
    return assetPath;
  }

  if (!assetsUrl) {
    return assetPath;
  }

  const normalizedBaseUrl = assetsUrl.replace(/\/$/, "");
  const normalizedAssetPath = assetPath.startsWith("/")
    ? assetPath
    : `/${assetPath.replace(/^\.\//, "")}`;

  return `${normalizedBaseUrl}${normalizedAssetPath}`;
}

export function useResolvedAssetUrl(assetPath: string | undefined) {
  const loaderData = RootRoute.useLoaderData();

  return resolveAssetUrl(assetPath, loaderData?.assetsUrl);
}
