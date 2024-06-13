import { ComponentType } from 'react';

import useRouteOpen from '../hooks/useRouteOpen';

interface Props {
  open: boolean;
  onClosing: () => void;
  onClosed: (immediate?: boolean) => void;
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

  const { open, onClosing, onClosed } = useRouteOpen(true);

  function handleClosing() {
    onClosing();
  }

  function handleClosed(immediate = false) {
    onClosed(immediate, onClose);
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
