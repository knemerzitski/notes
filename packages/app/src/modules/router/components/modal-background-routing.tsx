import { ComponentType, ReactElement, Suspense, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useLocation, Location, RoutesProps, Route, RouteProps } from 'react-router-dom';
import { isDefined } from '~utils/type-guards/is-defined';

import { SnackbarErrorBoundary } from '../../common/components/snackbar-error-boundary';
import { usePreviousLocation } from '../hooks/use-previous-location';
import { getParentFromSuffix } from '../utils/get-parent-from-suffix';
import { matchPathSuffix } from '../utils/match-path-suffix';

interface ModalBackgroundRouteProps {
  DefaultRoutes: ComponentType<RoutesProps>;
  modalRoutes: ReactElement<RoutesProps>;
}

export function ModalBackgroundRouting({
  DefaultRoutes,
  modalRoutes,
}: ModalBackgroundRouteProps) {
  const modalPaths = useMemo(() => extractModalPaths(modalRoutes), [modalRoutes]);

  return (
    <>
      <DefaultOrModalBackgroundRoute
        DefaultRoutes={DefaultRoutes}
        modalPaths={modalPaths}
      />

      <ErrorBoundary FallbackComponent={SnackbarErrorBoundary}>
        <Suspense fallback={null}>{modalRoutes}</Suspense>
      </ErrorBoundary>
    </>
  );
}

/**
 * Read and collect <Route path/> 'path' prop value
 */
function extractModalPaths(
  routeElements: ReactElement<RoutesProps, string | React.JSXElementConstructor<unknown>>
): string[] {
  if (Array.isArray(routeElements.props.children)) {
    return routeElements.props.children
      .filter((child: { type?: unknown } | null) => child?.type === Route)
      .map((route) => (route as ReactElement<RouteProps>).props.path)
      .filter(isDefined);
  }
  return [];
}

function DefaultOrModalBackgroundRoute({
  DefaultRoutes,
  modalPaths,
}: {
  DefaultRoutes: ComponentType<RoutesProps>;
  modalPaths: string[];
}) {
  const location = useLocation();
  const previousLocation = usePreviousLocation();

  let modalBackgroundLocation: Location | undefined;
  const currentModalPath = matchPathSuffix(modalPaths, location.pathname);
  if (currentModalPath) {
    const backgroundPathname = getParentFromSuffix(currentModalPath, location.pathname);
    modalBackgroundLocation = {
      hash: '',
      key: 'default',
      pathname: backgroundPathname,
      search: '',
      state: null,
    };
  }

  const isPreviousLocationModal =
    previousLocation && !!matchPathSuffix(modalPaths, previousLocation.pathname);

  let mainOrBgLocation = location;
  if (modalBackgroundLocation) {
    if (!isPreviousLocationModal && previousLocation) {
      mainOrBgLocation = previousLocation;
    } else {
      mainOrBgLocation = modalBackgroundLocation;
    }
  }

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
