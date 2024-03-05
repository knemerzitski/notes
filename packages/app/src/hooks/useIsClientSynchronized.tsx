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
const UpdateContext = createContext<UpdateFn>(() => {});
const IsSyncContext = createContext(false);

// eslint-disable-next-line react-refresh/only-export-components
export default function useIsClientSynchronized() {
  return useContext(IsSyncContext);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUpdateClientSyncStatus() {
  return useContext(UpdateContext);
}

export function ClientSyncStatusProvider({ children }: { children: ReactNode }) {
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
