import { RouteSnackbarError } from './route-snackbar-error';

export function SnackbarErrorBoundary({ error }: { error: Error }) {
  return <RouteSnackbarError>{error.message}</RouteSnackbarError>;
}
