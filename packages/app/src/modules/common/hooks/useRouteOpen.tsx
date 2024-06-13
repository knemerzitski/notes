import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, Location } from 'react-router-dom';

import {
  useProxyNavigate,
  useProxyRouteInverseTransform,
} from '../../router/context/ProxyRoutesProvider';
import usePreviousLocation from '../../router/hooks/usePreviousLocation';
import { useBackgroundPath } from '../../router/context/BackgroundPathProvider';

export default function useRouteOpen(defaultOpen = false) {
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
    setOpen(false);
  }, []);

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
        !previousLocation.state?.replaced
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
