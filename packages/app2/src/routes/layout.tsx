import { createFileRoute, Outlet } from '@tanstack/react-router';

import { AppBarDrawerLayout } from '../layout/components/AppBarDrawerLayout';

export const Route = createFileRoute('/_root_layout')({
  component: Layout,
});

function Layout() {
  return (
    <AppBarDrawerLayout>
      <Outlet />
    </AppBarDrawerLayout>
  );
}
