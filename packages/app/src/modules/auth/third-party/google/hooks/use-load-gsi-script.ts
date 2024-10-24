import { useRef, useState } from 'react';
import { isEnvVarStringTrue } from '~utils/string/is-env-var-string-true';

import { useScript } from '../../../../common/hooks/use-script';

const MOCK =
  import.meta.env.MODE === 'production'
    ? false
    : isEnvVarStringTrue(import.meta.env.VITE_MOCK_GOOGLE_AUTH);

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
    noScript: MOCK,
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
