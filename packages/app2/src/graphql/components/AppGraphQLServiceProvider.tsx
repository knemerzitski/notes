/* eslint-disable unicorn/filename-case */
import { ReactNode, useRef } from 'react';
import { GraphQLServiceProvider } from './GraphQLServiceProvider';
import { createDefaultGraphQLService } from '..';

export function AppGraphQLServiceProvider({
  children,
  restoringCacheFallback,
}: {
  children: ReactNode;
  restoringCacheFallback?: ReactNode;
}) {
  const service = useRef(createDefaultGraphQLService());

  return (
    <GraphQLServiceProvider
      value={service.current}
      restoringCacheFallback={restoringCacheFallback}
    >
      {children}
    </GraphQLServiceProvider>
  );
}
