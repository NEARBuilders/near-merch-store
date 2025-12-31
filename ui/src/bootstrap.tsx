import './public-path'; // must be first
import { StrictMode } from 'react';
import { ThemeProvider } from 'next-themes';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Toaster } from 'sonner';

import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx';

import { routeTree } from './routeTree.gen.ts';

import './styles.css';

const TanStackQueryProviderContext = TanStackQueryProvider.getContext();
const router = createRouter({
  routeTree,
  context: {
    ...TanStackQueryProviderContext,
  },
  defaultPreload: 'intent',
  // Enable scroll restoration for back/forward navigation
  scrollRestoration: true,
  // Use 'instant' to avoid jarring smooth scroll when restoring positions
  scrollRestorationBehavior: 'instant',
  // Target the host's scroll container for scroll-to-top on new navigations
  // The host wraps the UI in a div#main-scroll-container with overflow: auto
  // Also include 'window' as fallback for standalone mode
  scrollToTopSelectors: ['#main-scroll-container', 'window'],
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <StrictMode>
      <TanStackQueryProvider.Provider {...TanStackQueryProviderContext}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <RouterProvider router={router} />
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </TanStackQueryProvider.Provider>
    </StrictMode>
  );
}

export default App;
