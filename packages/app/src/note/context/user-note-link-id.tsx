import { createContext, ReactNode, useContext } from 'react';

import { Maybe } from '../../../../utils/src/types';

import { UserNoteLink } from '../../__generated__/graphql';

const UserNoteLinkIdContext = createContext<UserNoteLink['id'] | null>(null);

export function useUserNoteLinkId(nullable: true): Maybe<UserNoteLink['id']>;
export function useUserNoteLinkId(nullable?: false): UserNoteLink['id'];
export function useUserNoteLinkId(nullable?: boolean): Maybe<UserNoteLink['id']> {
  const ctx = useContext(UserNoteLinkIdContext);
  if (ctx === null && !nullable) {
    throw new Error('useUserNoteLinkId() requires context <UserNoteLinkIdProvider>');
  }
  return ctx;
}

export function UserNoteLinkIdProvider({
  userNoteLinkId: userNoteLinkId,
  children,
}: {
  userNoteLinkId?: UserNoteLink['id'];
  children: ReactNode;
}) {
  if (!userNoteLinkId) {
    return children;
  }

  return (
    <UserNoteLinkIdContext.Provider value={userNoteLinkId}>
      {children}
    </UserNoteLinkIdContext.Provider>
  );
}
