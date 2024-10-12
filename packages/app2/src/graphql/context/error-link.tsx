import { createContext, ReactNode, useContext } from 'react';
import { Maybe } from '~utils/types';
import { ErrorLink } from '../link/error';

type ProvidedErrorLink = Pick<ErrorLink, 'eventBus'>;

const ErrorLinkContext = createContext<ProvidedErrorLink | null>(null);

export function useErrorLink(nullable: true): Maybe<ProvidedErrorLink>;
export function useErrorLink(nullable?: false): ProvidedErrorLink;
export function useErrorLink(nullable?: boolean): Maybe<ProvidedErrorLink> {
  const ctx = useContext(ErrorLinkContext);
  if (ctx === null && !nullable) {
    throw new Error('useErrorLink() requires context <ErrorLinkProvider>');
  }
  return ctx;
}

export function ErrorLinkProvider({
  errorLink,
  children,
}: {
  errorLink: ProvidedErrorLink;
  children: ReactNode;
}) {
  return (
    <ErrorLinkContext.Provider value={errorLink}>{children}</ErrorLinkContext.Provider>
  );
}
