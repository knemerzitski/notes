import { useRouteError } from 'react-router-dom';
import FullSizeErrorContainer from '../common/components/FullSizeErrorContainer';

export default function ErrorPage() {
  const routeError = useRouteError() as { statusText?: string; status: number } | Error;

  const message =
    routeError instanceof Error
      ? routeError.message
      : routeError.status + (routeError.statusText ? ' ' + routeError.statusText : '');

  const stack =
    routeError instanceof Error && !import.meta.env.PROD ? routeError.stack : null;

  return <FullSizeErrorContainer message={message} stack={stack} />;
}
