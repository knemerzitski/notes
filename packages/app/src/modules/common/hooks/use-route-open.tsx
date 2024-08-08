import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, Location } from 'react-router-dom';

import { useBackgroundPath } from '../../router/context/background-path-provider';
import {
  useProxyNavigate,
  useProxyRouteInverseTransform,
} from '../../router/context/proxy-routes-provider';
import { usePreviousLocation } from '../../router/hooks/use-previous-location';

export function useRouteOpen(defaultOpen = false) {
  const navigate = useProxyNavigate();
  const previousLocation = usePreviousLocation();
  const [open, setOpen] = useState(defaultOpen);
  const isClosingRef = useRef(false);
  const location = useLocation();
  const initialLocationRef = useRef<Location | null>(location);
  const backgroundPath = useBackgroundPath();
  const inverseTransform = useProxyRouteInverseTransform();

  const reset = useCallback(() => {
    isClosingRef.current = false;
    setOpen(defaultOpen);
  }, [defaultOpen]);

  useEffect(() => {
    if (initialLocationRef.current !== location) {
      reset();
    }
  }, [location, reset]);

  function handleClosing() {
    setOpen(false);
    isClosingRef.current = true;
  }

  function handleClosed(immediate = false, preventNavigation?: () => boolean) {
    if (!immediate && !isClosingRef.current) return;

    if (!preventNavigation?.()) {
      if (
        previousLocation &&
        (inverseTransform(previousLocation.pathname) !==
          inverseTransform(location.pathname) ||
          previousLocation.search !== location.search) &&
        !(previousLocation.state as { replaced?: boolean } | undefined)?.replaced
      ) {
        navigate(-1);
      } else if (backgroundPath) {
        navigate(backgroundPath);
      } else {
        navigate('/');
      }
    }

    isClosingRef.current = false;
  }

  return {
    open,
    setOpen,
    onClosing: handleClosing,
    onClosed: handleClosed,
  };
}
