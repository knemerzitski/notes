import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_root_layout/notes')({
  component: Notes,
});

function Notes() {
  return (
    <>
      Notes: <Outlet />
    </>
  );
}
