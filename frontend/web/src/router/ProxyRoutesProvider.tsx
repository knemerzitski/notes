import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import {
  NavigateFunction,
  Location,
  To,
  NavigateOptions,
  useLocation,
} from 'react-router-dom';

import { useRouter } from './RouterProvider';

const ProxyTransformContext = createContext<ProxyRoutesProviderProps['transform'] | null>(
  null
);

// eslint-disable-next-line react-refresh/only-export-components
export function useProxyTransform() {
  const ctx = useContext(ProxyTransformContext);
  if (ctx === null) {
    throw new Error(
      'Error: useProxyTransform() may be used only in the context of a <ProxyRoutesProvider> component.'
    );
  }
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProxyNavigate() {
  const transform = useProxyTransform();
  const { router } = useRouter();

  const proxyNavigate: NavigateFunction = (
    to: To | number,
    options?: NavigateOptions
  ) => {
    if (typeof to === 'number') {
      void router.navigate(to);
    } else {
      if (typeof to === 'string') {
        void router.navigate(transform(to), options);
      } else {
        void router.navigate({ ...to, pathname: transform(to.pathname ?? '') }, options);
      }
    }
  };

  return proxyNavigate;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProxyAbsoluteLocation() {
  const transform = useProxyTransform();
  const { router } = useRouter();

  const [proxyLocation, setProxyLocation] = useState<Location | null>(null);

  useEffect(() => {
    const unsubscribe = router.subscribe((state: { location: Location }) => {
      setProxyLocation({
        ...state.location,
        pathname: transform(state.location.pathname),
      });
    });
    return unsubscribe;
  }, [router, transform]);

  return proxyLocation;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProxyLocation(): Location {
  const transform = useProxyTransform();
  const location = useLocation();

  return {
    ...location,
    pathname: transform(location.pathname),
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProxyIsAbsolutePathname(pathname: To) {
  const transform = useProxyTransform();
  const { router } = useRouter();
  const [isPathname, setIsPathname] = useState(false);

  const testPathname = transform(
    typeof pathname === 'string' ? pathname : pathname.pathname ?? ''
  );

  useEffect(() => {
    const unsubscribe = router.subscribe((state: { location: Location }) => {
      setIsPathname(state.location.pathname === testPathname);
    });
    return unsubscribe;
  }, [testPathname, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsPathname(window.location.pathname.replace(/\/$/g, '') === testPathname);
  }, [testPathname]);

  return isPathname;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProxyIsPathname(pathname: To) {
  const transform = useProxyTransform();
  const location = useLocation();

  const testPathname = transform(
    typeof pathname === 'string' ? pathname : pathname.pathname ?? ''
  );

  return location.pathname === testPathname;
}

interface ProxyRoutesProviderProps {
  transform: (pathname: string) => string;
  children: ReactNode;
}

export default function ProxyRoutesProvider({
  transform,
  children,
}: ProxyRoutesProviderProps) {
  return (
    <ProxyTransformContext.Provider value={transform}>
      {children}
    </ProxyTransformContext.Provider>
  );
}
