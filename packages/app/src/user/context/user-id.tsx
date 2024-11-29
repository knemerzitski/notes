import { createContext, ReactNode, useContext } from 'react';
import { Maybe } from '~utils/types';
import { SignedInUser } from '../../__generated__/graphql';

const UserIdContext = createContext<SignedInUser['id'] | null>(null);

export function useUserId(nullable: true): Maybe<SignedInUser['id']>;
export function useUserId(nullable?: false): SignedInUser['id'];
export function useUserId(nullable?: boolean): Maybe<SignedInUser['id']> {
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
  userId?: SignedInUser['id'];
  children: ReactNode;
}) {
  if (!userId) {
    return children;
  }

  return <UserIdContext.Provider value={userId}>{children}</UserIdContext.Provider>;
}
