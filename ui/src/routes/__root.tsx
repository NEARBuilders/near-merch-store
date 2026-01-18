import {
  createRootRouteWithContext,
  Outlet,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import type { RouterContext } from "@/types";

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: ({ context }) => {
    return {
      assetsUrl: context.assetsUrl || "",
      siteUrl: context.runtimeConfig?.hostUrl || "",
    };
  },
  head: ({ loaderData }) => {
    const assetsUrl = loaderData?.assetsUrl || "";
    const siteUrl = loaderData?.siteUrl || "";
    const title = "Near Merch";
    const description =
      "NEAR-powered merch store for the NEAR ecosystem";
    const siteName = "Near Merch";
    const ogImage = `${assetsUrl}/metadata.png`;

    return {
      meta: [
        { charSet: "utf-8" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1.0, viewport-fit=cover",
        },
        { title },
        { name: "description", content: description },
        { name: "theme-color", content: "#171717" },
        { name: "color-scheme", content: "dark" },
        { name: "application-name", content: siteName },
        { name: "mobile-web-app-capable", content: "yes" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
        { name: "format-detection", content: "telephone=no" },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: siteUrl },
        { property: "og:image", content: ogImage },
        { property: "og:site_name", content: siteName },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [
        { rel: "canonical", href: siteUrl },
        { rel: "stylesheet", href: `${assetsUrl}/static/css/style.css` },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        { rel: "icon", type: "image/x-icon", href: `${assetsUrl}/favicon.ico` },
        { rel: "icon", type: "image/svg+xml", href: `${assetsUrl}/icon.svg` },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: `${assetsUrl}/apple-touch-icon.png`,
        },
        { rel: "manifest", href: `${assetsUrl}/manifest.json` },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: siteName,
            url: siteUrl,
            description,
          }),
        },
        {
          children: `(function(){document.documentElement.classList.add('dark');localStorage.setItem('theme','dark');})();`,
        },
      ],
    };
  },
  component: RootComponent,
});

function RootComponent() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
      <Outlet />
      <Toaster position="bottom-right" />
    </ThemeProvider>
  );
}
