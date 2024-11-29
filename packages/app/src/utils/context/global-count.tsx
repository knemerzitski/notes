import {
  Context,
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CountMap } from '~utils/map/count-map';
import { DefinedMap } from '~utils/map/defined-map';
import { ObservableMap } from '~utils/map/observable-map';
import { Observable, SubscriptionObserver } from 'zen-observable-ts';
import { Maybe } from '~utils/types';

type Id = unknown;

type UnsubscribeClosure = () => void;
type SubscribeClosure = (id: Id) => UnsubscribeClosure;
const SubscribeContext = createContext<SubscribeClosure>(() => () => {
  // do nothing
});

const globalPositiveContextMap = new DefinedMap(
  new Map<Id, Context<boolean | null>>(),
  (_key: Id) => createContext<boolean | null>(null)
);

/**
 * @returns `true` if global count is `> 0`, otherwise `false`
 */
export function useGlobalIsPositive(id: Id, nullable: true): Maybe<boolean>;
export function useGlobalIsPositive(id: Id, nullable?: false): boolean;
export function useGlobalIsPositive(id: Id, nullable?: boolean): Maybe<boolean> {
  const ctx = useContext(globalPositiveContextMap.get(id));
  if (ctx === null && !nullable) {
    throw new Error('useGlobalIsPositive() requires context <GlobalCountProvider>');
  }
  return ctx;
}

function createCountService() {
  const map = new Map<Id, number>();
  const observableMap = new ObservableMap(map);
  const countMap = new CountMap(observableMap);

  function createCountObservable(key: Id) {
    const countObservers = new Set<SubscriptionObserver<number>>();
    const countObservable = new Observable<number>((observer) => {
      observer.next(countMap.get(key));

      countObservers.add(observer);
      return () => {
        countObservers.delete(observer);
      };
    });
    return {
      countObservers,
      countObservable,
    };
  }

  const idSet = new Set<Id>();

  const idObservableMap = new DefinedMap(
    new Map<
      Id,
      {
        countObservers: Set<SubscriptionObserver<number>>;
        countObservable: Observable<number>;
      }
    >(),
    (key: Id) => {
      if (idSet.size > 0 && !idSet.has(key)) {
        console.error({ key });
        throw new Error(`<GlobalCountProvider> is missing id "${String(key)}"`);
      }
      return createCountObservable(key);
    }
  );

  observableMap.observable.subscribe((event) => {
    switch (event.type) {
      case 'set':
        idObservableMap.get(event.key).countObservers.forEach((observer) => {
          observer.next(event.value);
        });

        return;
    }
  });

  function updateIds(ids: Id[]) {
    idSet.clear();
    for (const id of ids) {
      idSet.add(id);
    }
  }

  return {
    getObservableById: (key: Id) => idObservableMap.get(key).countObservable,
    increment: countMap.increment.bind(countMap),
    decrement: countMap.decrement.bind(countMap),
    get: countMap.get.bind(countMap),
    update: updateIds,
  };
}

export function GlobalCountProvider({
  ids,
  children,
}: {
  children: ReactNode;
  ids: Id[];
}) {
  const countService = useMemo(createCountService, []);

  useEffect(() => {
    countService.update(ids);
  }, [countService, ids]);

  const subscribe: SubscribeClosure = useCallback(
    (id) => {
      countService.increment(id);
      return () => {
        countService.decrement(id);
      };
    },
    [countService]
  );

  return (
    <SubscribeContext.Provider value={subscribe}>
      {[...ids].reduce<ReactNode>((_children, id) => {
        return (
          <GlobalIsPositiveProvider
            id={id}
            observable={countService.getObservableById(id)}
          >
            {_children}
          </GlobalIsPositiveProvider>
        );
      }, children)}
    </SubscribeContext.Provider>
  );
}

function GlobalIsPositiveProvider({
  id,
  observable,
  children,
}: {
  id: Id;
  observable: Observable<number>;
  children: ReactNode;
}) {
  const GlobalPositiveContext = globalPositiveContextMap.get(id);
  const [isPositive, setIsPositive] = useState(false);

  useEffect(() => {
    const sub = observable.subscribe((count) => {
      setIsPositive(count > 0);
    });

    return () => {
      sub.unsubscribe();
    };
  }, [observable]);

  return (
    <GlobalPositiveContext.Provider value={isPositive}>
      {children}
    </GlobalPositiveContext.Provider>
  );
}

/**
 * Increment global count while component is rendered.
 *
 * Count can be accessed by following hooks:
 * - {@link useGlobalIsPositive}
 */
export function GlobalCountIncrement({ id }: { id: Id }) {
  const subscribe = useContext(SubscribeContext);

  useEffect(() => subscribe(id), [subscribe, id]);

  return null;
}
