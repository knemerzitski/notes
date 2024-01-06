import { ComponentType, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, Location } from 'react-router-dom';

import { useProxyNavigate } from '../../router/ProxyRoutesProvider';
import { useRouter } from '../../router/RouterProvider';
import useBackgroundPath from '../../router/hooks/useBackgroundPath';
import usePreviousLocation from '../../router/hooks/usePreviousLocation';

interface Props {
  open: boolean;
  onClosing: () => void;
  onClosed: () => void;
}

interface ComponentProps<T> extends Props {
  componentProps: T;
}

export type RouteClosableComponentProps<T = undefined> = T extends undefined
  ? Props
  : ComponentProps<T>;

interface CommonComponent {
  /**
   * Return true to prevent navigation on close.
   * Navigates back on false.
   * @returns
   */
  onClose?: () => boolean;
}

interface OnlyComponent extends CommonComponent {
  Component: ComponentType<Props>;
}

interface ComponentWithProps<T> extends CommonComponent {
  Component: ComponentType<ComponentProps<T>>;
  ComponentProps: T;
}

export default function RouteClosable<T = undefined>(
  props: OnlyComponent | ComponentWithProps<T>
) {
  const { onClose } = props;

  const navigate = useProxyNavigate();
  const previousLocation = usePreviousLocation();
  const [open, setOpen] = useState(true);
  const isClosingRef = useRef(false);
  const location = useLocation();
  const initialLocationRef = useRef<Location | null>(location);
  const backgroundPath = useBackgroundPath();
  const { router } = useRouter();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = router.subscribe(() => {
      hasNavigatedRef.current = true;
    });
    return unsubscribe;
  }, [router]);

  const reset = useCallback(() => {
    isClosingRef.current = false;
    setOpen(true);
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

  function handleClosed() {
    if (!isClosingRef.current) return;

    const navigationHandled = onClose?.();

    if (!navigationHandled && !hasNavigatedRef.current) {
      if (previousLocation) {
        navigate(-1);
      } else if (backgroundPath) {
        navigate(backgroundPath);
      } else {
        navigate('/');
      }
    }

    isClosingRef.current = false;
  }

  if ('ComponentProps' in props) {
    const { Component, ComponentProps } = props;
    return (
      <Component
        componentProps={ComponentProps}
        open={open}
        onClosing={handleClosing}
        onClosed={handleClosed}
      />
    );
  } else {
    const { Component } = props;
    return <Component open={open} onClosing={handleClosing} onClosed={handleClosed} />;
  }
}
