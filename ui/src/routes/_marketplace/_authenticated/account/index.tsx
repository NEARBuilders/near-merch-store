import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_marketplace/_authenticated/account/')({
  beforeLoad: () => {
    throw redirect({
      to: '/account/orders',
      replace: true,
    });
  },
});
