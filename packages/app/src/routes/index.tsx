import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_root_layout/')({
  component: Index,
});

function Index() {
  // Root index redirect to notes
  return <Navigate to="/notes" />;
}
