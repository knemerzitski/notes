import { useRef, useState } from 'react';

import { GOOGLE } from '../../../third-party';
import { useScript } from '../../../utils/hooks/useScript';

export interface UseLoadClientScriptOptions {
  onLoad?: () => void;
  onError?: () => void;
}

export function useLoadGsiScript(options: UseLoadClientScriptOptions = {}) {
  const { onLoad, onError } = options;

  const [isLoaded, setIsLoaded] = useState(false);

  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useScript({
    noScript: GOOGLE.mock,
    src: 'https://accounts.google.com/gsi/client',
    defer: true,
    async: true,
    onload: () => {
      setIsLoaded(true);
      onLoadRef.current?.();
    },
    onerror: () => {
      setIsLoaded(false);
      onErrorRef.current?.();
    },
  });

  return isLoaded;
}
