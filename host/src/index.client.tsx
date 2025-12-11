import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Components from './components';
import Main from './main';
import { initializeFederation } from './federation';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const pathname = window.location.pathname;

const getRouteComponent = () => {
  if (pathname === '/components') {
    return Components;
  }
  return Main;
};

const RootComponent = getRouteComponent();

// Initialize federation before rendering
initializeFederation().then(() => {
  createRoot(rootElement!).render(
    <StrictMode>
      <RootComponent />
    </StrictMode>
  );
}).catch((error) => {
  console.error('Failed to initialize federation:', error);
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Failed to initialize application. Check console for details.</div>';
});
