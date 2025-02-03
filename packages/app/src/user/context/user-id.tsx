import { createContext, ReactNode, useContext } from 'react';
import { Maybe } from '~utils/types';

import { User } from '../../__generated__/graphql';

const UserIdContext = createContext<User['id'] | null>(null);

export function useUserId(nullable: true): Maybe<User['id']>;
export function useUserId(nullable?: false): User['id'];
export function useUserId(nullable?: boolean): Maybe<User['id']> {
  const ctx = useContext(UserIdContext);
  if (ctx === null && !nullable) {
    throw new Error('useUserId() requires context <UserIdProvider>');
  }
  return ctx;
}

export function UserIdProvider({
  userId,
  children,
}: {
  userId?: User['id'];
  children: ReactNode;
}) {
  if (!userId) {
    return children;
  }

  return <UserIdContext.Provider value={userId}>{children}</UserIdContext.Provider>;
}
