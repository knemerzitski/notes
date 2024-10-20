import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import {
  NavigateFunction,
  Location,
  To,
  NavigateOptions,
  useLocation,
} from 'react-router-dom';

import { useRouter } from './router-provider';

const ProxyRouteTransformContext = createContext<ProxyRoutesProviderProps['transform']>(
  (s) => s
);
const ProxyRouteInverseTransformContext = createContext<
  ProxyRoutesProviderProps['transform']
>((s) => s);

// eslint-disable-next-line react-refresh/only-export-components
export function useProxyRouteTransform() {
  return useContext(ProxyRouteTransformContext);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProxyRouteInverseTransform() {
  return useContext(ProxyRouteInverseTransformContext);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProxyNavigate() {
  const transform = useProxyRouteTransform();
  const router = useRouter();

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
export function useProxyIsAbsolutePathname(pathname: To) {
  const transform = useProxyRouteTransform();
  const router = useRouter();
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
  const transform = useProxyRouteTransform();
  const location = useLocation();

  const testPathname = transform(
    typeof pathname === 'string' ? pathname : pathname.pathname ?? ''
  );

  return location.pathname === testPathname;
}

interface ProxyRoutesProviderProps {
  transform: (pathname: string) => string;
  inverseTransform: (pathname: string) => string;
  children: ReactNode;
}

export function ProxyRoutesProvider({
  transform,
  inverseTransform,
  children,
}: ProxyRoutesProviderProps) {
  return (
    <ProxyRouteTransformContext.Provider value={transform}>
      <ProxyRouteInverseTransformContext.Provider value={inverseTransform}>
        {children}
      </ProxyRouteInverseTransformContext.Provider>
    </ProxyRouteTransformContext.Provider>
  );
}
