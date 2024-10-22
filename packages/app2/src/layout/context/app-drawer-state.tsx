import {
  createContext,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useState,
} from 'react';
import { useIsMobile } from '../../theme/context/is-mobile';
import { useApolloClient } from '@apollo/client';
import { isAppDrawerOpen } from '../../device-preferences/models/app-drawer/is';
import { setAppDrawerOpen } from '../../device-preferences/models/app-drawer/set';
import { mapSetState } from '../../utils/map-set-state';

const IsAppDrawerOpenContext = createContext<boolean | null>(null);
const SetAppDrawerOpenContext = createContext<
  ((action: SetStateAction<boolean>) => void) | null
>(null);

const IsAppDrawerFloatingContext = createContext<boolean>(false);
const SetAppDrawerFloatingContext = createContext<
  (action: SetStateAction<boolean>) => void
>(() => {
  // do nothing
});

export function useIsAppDrawerOpen() {
  const ctx = useContext(IsAppDrawerOpenContext);
  if (ctx === null) {
    throw new Error('useIsAppDrawerOpen() requires context <AppDrawerStateProvider>');
  }
  return ctx;
}

export function useSetAppDrawerOpen() {
  const ctx = useContext(SetAppDrawerOpenContext);
  if (ctx === null) {
    throw new Error('useSetAppDrawerState() requires context <AppDrawerStateProvider>');
  }
  return ctx;
}

export function useIsAppDrawerFloating() {
  return useContext(IsAppDrawerFloatingContext);
}

export function useSetAppDrawerFloating() {
  return useContext(SetAppDrawerFloatingContext);
}

/**
 * Remember drawer open in Apollo cache.
 */
function DesktopAppDrawerStateProvider({ children }: { children: ReactNode }) {
  const client = useApolloClient();

  const [isOpen, setIsOpen] = useState<boolean>(() => isAppDrawerOpen(client.cache));
  const [isFloating, setIsFloating] = useState(false);

  const handleSetIsOpen: (action: SetStateAction<boolean>) => void = useCallback(
    (action) => {
      mapSetState(action, setIsOpen, (_prev, next) => {
        setAppDrawerOpen(next, client.cache);
        return next;
      });
    },
    [client]
  );

  return (
    <IsAppDrawerOpenContext.Provider value={isOpen}>
      <IsAppDrawerFloatingContext.Provider value={isFloating}>
        <SetAppDrawerOpenContext.Provider value={handleSetIsOpen}>
          <SetAppDrawerFloatingContext.Provider value={setIsFloating}>
            {children}
          </SetAppDrawerFloatingContext.Provider>
        </SetAppDrawerOpenContext.Provider>
      </IsAppDrawerFloatingContext.Provider>
    </IsAppDrawerOpenContext.Provider>
  );
}

function MobileAppDrawerStateProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <IsAppDrawerOpenContext.Provider value={isOpen}>
      <SetAppDrawerOpenContext.Provider value={setIsOpen}>
        {children}
      </SetAppDrawerOpenContext.Provider>
    </IsAppDrawerOpenContext.Provider>
  );
}

export function AppDrawerStateProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileAppDrawerStateProvider>{children}</MobileAppDrawerStateProvider>;
  } else {
    return <DesktopAppDrawerStateProvider>{children}</DesktopAppDrawerStateProvider>;
  }
}
