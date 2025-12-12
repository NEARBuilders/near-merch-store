import { StrictMode } from 'react';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';

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
  scrollRestoration: true,
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
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </TanStackQueryProvider.Provider>
    </StrictMode>
  );
}

export default App;
