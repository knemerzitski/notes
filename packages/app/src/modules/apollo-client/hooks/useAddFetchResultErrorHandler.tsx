import { createContext, useContext, ReactNode } from 'react';

import ErrorLink from '../links/error-link';

const AddFetchResultErrorHandlerContext = createContext<ErrorLink['addHandler'] | null>(
  null
);

// eslint-disable-next-line react-refresh/only-export-components
export default function useAddFetchResultErrorHandler() {
  const ctx = useContext(AddFetchResultErrorHandlerContext);
  if (ctx === null) {
    throw new Error(
      'useAddFetchResultErrorHandler() requires context <AddFetchResultErrorHandlerProvider>'
    );
  }
  return ctx;
}

export function AddFetchResultErrorHandlerProvider({
  children,
  errorLink,
}: {
  children: ReactNode;
  errorLink: ErrorLink;
}) {
  return (
    <AddFetchResultErrorHandlerContext.Provider value={(h) => errorLink.addHandler(h)}>
      {children}
    </AddFetchResultErrorHandlerContext.Provider>
  );
}
