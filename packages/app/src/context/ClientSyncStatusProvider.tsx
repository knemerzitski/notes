import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

type UpdateFn = (key: unknown, synchronized: boolean) => void;

// eslint-disable-next-line @typescript-eslint/no-empty-function
const UpdateContext = createContext<UpdateFn | null>(null);
const IsSyncContext = createContext<boolean | null>(false);

// eslint-disable-next-line react-refresh/only-export-components
export function useIsClientSynchronized() {
  const ctx = useContext(IsSyncContext);
  if (ctx === null) {
    throw new Error(
      'useIsClientSynchronized() requires context <ClientSyncStatusProvider>'
    );
  }
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUpdateClientSyncStatus() {
  const ctx = useContext(UpdateContext);
  if (ctx === null) {
    throw new Error(
      'useUpdateClientSyncStatus() requires context <ClientSyncStatusProvider>'
    );
  }
  return ctx;
}

export default function ClientSyncStatusProvider({ children }: { children: ReactNode }) {
  const activeKeysRef = useRef(new Set());
  const [isSynchronized, setIsSynchronized] = useState(true);

  const update = useCallback((key: unknown, synchronized: boolean) => {
    if (synchronized) {
      activeKeysRef.current.delete(key);
      setIsSynchronized(activeKeysRef.current.size === 0);
    } else {
      activeKeysRef.current.add(key);
      setIsSynchronized(false);
    }
  }, []);

  return (
    <UpdateContext.Provider value={update}>
      <IsSyncContext.Provider value={isSynchronized}>{children}</IsSyncContext.Provider>
    </UpdateContext.Provider>
  );
}
