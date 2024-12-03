import {
  AnyRouter,
  RegisteredRouter,
  ToPathOption,
  createLink,
} from '@tanstack/react-router';
import { ReactNode } from 'react';

import { useIsPathname } from '../../utils/hooks/useIsPathname';

import { DrawerListItemButton } from './DrawerListItemButton';
import { DrawerListItemIcon } from './DrawerListItemIcon';
import { DrawerListItemText } from './DrawerListItemText';

export function DrawerNavListItemButton<
  TRouter extends AnyRouter = RegisteredRouter,
  TFrom extends string = string,
  TTo extends string | undefined = '.',
>({
  to,
  icon,
  text,
}: {
  to: ToPathOption<TRouter, TFrom, TTo>;
  icon: ReactNode;
  text: ReactNode;
}) {
  const isPathname = useIsPathname(to, {
    startsWith: true,
  });

  const isActive = isPathname;

  return (
    // @ts-expect-error Type hints work outside this component
    <DrawerListItemButtonLink active={isActive} to={to} preload="intent">
      <DrawerListItemIcon>{icon}</DrawerListItemIcon>
      <DrawerListItemText>{text}</DrawerListItemText>
    </DrawerListItemButtonLink>
  );
}

const DrawerListItemButtonLink = createLink(DrawerListItemButton);
