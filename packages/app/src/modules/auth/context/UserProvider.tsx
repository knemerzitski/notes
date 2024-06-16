import { ReactNode, createContext, useContext } from 'react';

import { UserListItemProps } from '../components/UserListItem';

const UserContext = createContext<UserListItemProps['user'] | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  const ctx = useContext(UserContext);
  if (ctx === null) {
    throw new Error('useUser() requires context <UserProvider>');
  }
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUserMaybe() {
  return useContext(UserContext);
}

interface UserProviderProps {
  user: UserListItemProps['user'];
  children: ReactNode;
}

export default function UserProvider({ user, children }: UserProviderProps) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
