import { ComponentType, ReactElement, Suspense, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { matchRoutes, useLocation, Location, RoutesProps } from 'react-router-dom';

import SnackbarErrorBoundary from '../../components/feedback/SnackbarErrorBoundary';
import { useProxyRouteTransform } from '../ProxyRoutesProvider';
import { useRouter } from '../RouterProvider';
import usePreviousLocation from '../hooks/usePreviousLocation';

interface ModalBackgroundRouteProps {
  DefaultRoutes: ComponentType<RoutesProps>;
  modalRoutes: ReactElement<RoutesProps>;
}

export default function ModalBackgroundRouting({
  DefaultRoutes,
  modalRoutes,
}: ModalBackgroundRouteProps) {
  return (
    <>
      <DefaultOrModalBackgroundRoute DefaultRoutes={DefaultRoutes} />

      <ErrorBoundary FallbackComponent={SnackbarErrorBoundary}>
        <Suspense fallback={null}>{modalRoutes}</Suspense>
      </ErrorBoundary>
    </>
  );
}

function DefaultOrModalBackgroundRoute({
  DefaultRoutes,
}: {
  DefaultRoutes: ComponentType<RoutesProps>;
}) {
  const pathnameTransform = useProxyRouteTransform();
  const location = useLocation();
  const previousLocation = usePreviousLocation();
  const { modalRoutes } = useRouter();

  //Check if current route is a modal with background location defined
  let modalBackgroundLocation: Location | undefined;
  const matchedModalRoutes = matchRoutes(modalRoutes, location);
  if (matchedModalRoutes && matchedModalRoutes.length > 0) {
    const route = matchedModalRoutes[matchedModalRoutes.length - 1].route;
    if (route.backgroundPath) {
      modalBackgroundLocation = {
        hash: '',
        key: 'default',
        pathname: pathnameTransform(route.backgroundPath),
        search: '',
        state: null,
      };
    }
  }

  // Check if previous route was a modal with background location defined
  let isPreviousLocationModal = false;
  const previousMatchedModalRoutes = previousLocation
    ? matchRoutes(modalRoutes, previousLocation)
    : null;
  if (previousMatchedModalRoutes && previousMatchedModalRoutes.length > 0) {
    // TODO check for possible null?
    const route = previousMatchedModalRoutes[previousMatchedModalRoutes.length - 1].route;
    isPreviousLocationModal = !!route.backgroundPath;
  }

  let mainOrBgLocation = location;
  if (modalBackgroundLocation) {
    if (!isPreviousLocationModal && previousLocation) {
      mainOrBgLocation = previousLocation;
    } else {
      mainOrBgLocation = modalBackgroundLocation;
    }
  }

  // TODO use React.memo instead?
  const mainOrBgRoutes = useMemo(() => {
    const loc = {
      key: mainOrBgLocation.key,
      pathname: mainOrBgLocation.pathname,
      search: mainOrBgLocation.search,
      hash: mainOrBgLocation.hash,
      state: mainOrBgLocation.state as unknown,
    };
    return <DefaultRoutes location={loc} />;
  }, [
    // Memo only values, not location object itself as it can change while values inside are still same
    mainOrBgLocation.pathname,
    mainOrBgLocation.search,
    mainOrBgLocation.hash,
    mainOrBgLocation.state,
    mainOrBgLocation.key,
    DefaultRoutes,
  ]);

  return mainOrBgRoutes;
}
