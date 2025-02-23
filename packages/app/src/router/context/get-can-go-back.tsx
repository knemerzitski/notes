import { useRouter } from '@tanstack/react-router';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';

type CanGoBackFn = () => boolean;

const CanGoBackFnContext = createContext<CanGoBackFn | null>(null);

export function useGetCanGoBack() {
  const ctx = useContext(CanGoBackFnContext);
  if (ctx === null) {
    throw new Error('useGetCanGoBack() requires context <GetCanGoBackProvider>');
  }
  return ctx;
}

export function GetCanGoBackProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const stateRef = useRef<{ index: number }>({
    index: -1,
  });

  useEffect(
    () =>
      router.history.subscribe(({ action }) => {
        if (action.type === 'FORWARD') {
          stateRef.current.index++;
        } else if (action.type === 'BACK') {
          stateRef.current.index--;
        } else if (action.type === 'GO') {
          stateRef.current.index = action.index;
        } else if (action.type === 'PUSH') {
          stateRef.current.index++;
        } else {
          // REPLACE no index change
        }
      }),
    [router]
  );

  const getCanGoBack = useCallback(() => {
    return stateRef.current.index > 0;
  }, []);

  return (
    <CanGoBackFnContext.Provider value={getCanGoBack}>
      {children}
    </CanGoBackFnContext.Provider>
  );
}
