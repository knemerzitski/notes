import { ReactNode } from 'react';
import { DrawerListItemButton } from './DrawerListItemButton';
import { DrawerListItemIcon } from './DrawerListItemIcon';
import { DrawerListItemText } from './DrawerListItemText';
import { useIsPathname } from '../../utils/hooks/useIsPathname';
import {
  AnyRouter,
  RegisteredRouter,
  ToPathOption,
  useNavigate,
} from '@tanstack/react-router';

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
  const navigate = useNavigate();
  const isPathname = useIsPathname(to, {
    startsWith: true,
  });

  const isActive = isPathname;

  function handleClick() {
    // @ts-expect-error Type hinting works, good enough
    void navigate({
      to,
    });
  }

  return (
    <DrawerListItemButton active={isActive} onClick={handleClick}>
      <DrawerListItemIcon>{icon}</DrawerListItemIcon>
      <DrawerListItemText>{text}</DrawerListItemText>
    </DrawerListItemButton>
  );
}
