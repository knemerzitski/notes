import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_root_layout/')({
  component: Index,
});

function Index() {
  return (
    <>
      Root Index <Outlet />
    </>
  );
}
