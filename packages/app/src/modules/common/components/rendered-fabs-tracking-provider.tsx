import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

const RenderedFabSubscribeContext = createContext<((id: string) => () => void) | null>(
  null
);
const IsRenderingFabContext = createContext<boolean | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useSubscribeRenderingFab() {
  return useContext(RenderedFabSubscribeContext);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useIsRenderingFab() {
  return useContext(IsRenderingFabContext);
}

export function RenderedFabsTrackingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const fabsIdsSetRef = useRef(new Set<string>());
  const [hasFabs, setHasFabs] = useState<boolean>(false);

  const subscribeFab = useCallback((id: string) => {
    fabsIdsSetRef.current.add(id);
    setHasFabs(true);
    return () => {
      fabsIdsSetRef.current.delete(id);
      setHasFabs(fabsIdsSetRef.current.size > 0);
    };
  }, []);

  return (
    <RenderedFabSubscribeContext.Provider value={subscribeFab}>
      <IsRenderingFabContext.Provider value={hasFabs}>
        {children}
      </IsRenderingFabContext.Provider>
    </RenderedFabSubscribeContext.Provider>
  );
}
