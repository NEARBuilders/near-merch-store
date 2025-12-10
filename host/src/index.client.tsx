import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Components from './components';
import Main from './main';

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

createRoot(rootElement).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>
);
