import RouteSnackbarError from './RouteSnackbarError';

export default function SnackbarErrorBoundary({ error }: { error: Error }) {
  return <RouteSnackbarError>{error.message}</RouteSnackbarError>;
}
