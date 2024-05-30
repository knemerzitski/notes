import { ComponentType, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, Location } from 'react-router-dom';

import {
  useProxyNavigate,
  useProxyRouteInverseTransform,
} from '../../router/context/ProxyRoutesProvider';
import usePreviousLocation from '../../router/hooks/usePreviousLocation';
import { useBackgroundPath } from '../../router/components/ModalBackgroundRouting';

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
  const inverseTransform = useProxyRouteInverseTransform();

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

    if (!navigationHandled) {
      if (
        previousLocation &&
        (inverseTransform(previousLocation.pathname) !==
          inverseTransform(location.pathname) ||
          previousLocation.search !== location.search)
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
