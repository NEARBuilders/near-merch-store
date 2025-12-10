import { renderToString } from 'react-dom/server';
import { StrictMode } from 'react';
import Main from './main';
import Components from './components';
import NotFound from './not-found';

const getRouteComponent = (pathname: string) => {
  switch (pathname) {
    case '/':
      return Main;
    case '/components':
      return Components;
    default:
      return NotFound;
  }
};

export function render(pathname: string): string {
  const Component = getRouteComponent(pathname);

  return renderToString(
    <StrictMode>
      <Component />
    </StrictMode>
  );
}

export { Main, Components, NotFound };
