import { useEffect, useState } from 'react';

import { usePersistor } from '../context/persistor';

export function useIsPersistPending() {
  const persistor = usePersistor();

  const [isPending, setIsPending] = useState(false);

  useEffect(
    () =>
      persistor.on('isPending', (value) => {
        setTimeout(() => {
          setIsPending(value);
        });
      }),
    [persistor]
  );

  return isPending;
}
