import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Index,
  beforeLoad() {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({
      to: '/notes',
      search: (prev) => prev,
      replace: true,
    });
  },
});

function Index() {
  // Will be redirected in beforeLoad
  return null;
}
