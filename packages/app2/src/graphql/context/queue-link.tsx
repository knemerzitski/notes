import QueueLink from 'apollo-link-queue';
import { createContext, ReactNode, useContext } from 'react';
import { Maybe } from '~utils/types';

type ProvidedQueueLink = Pick<QueueLink, 'open' | 'close'>;

const QueueLinkContext = createContext<ProvidedQueueLink | null>(null);

export function useQueueLink(nullable: true): Maybe<ProvidedQueueLink>;
export function useQueueLink(nullable?: false): ProvidedQueueLink;
export function useQueueLink(nullable?: boolean): Maybe<ProvidedQueueLink> {
  const ctx = useContext(QueueLinkContext);
  if (ctx === null && !nullable) {
    throw new Error('useQueueLink() requires context <QueueLinkProvider>');
  }
  return ctx;
}

export function QueueLinkProvider({
  value,
  children,
}: {
  value: ProvidedQueueLink;
  children: ReactNode;
}) {
  return <QueueLinkContext.Provider value={value}>{children}</QueueLinkContext.Provider>;
}
