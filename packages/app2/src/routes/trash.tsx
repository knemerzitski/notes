import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_root_layout/trash')({
  component: Trash,
});

function Trash() {
  return (
    <>
      Trash: <Outlet />
    </>
  );
}
