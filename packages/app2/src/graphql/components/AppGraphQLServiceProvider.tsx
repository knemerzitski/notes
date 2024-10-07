/* eslint-disable unicorn/filename-case */
import { ReactNode } from 'react';
import { GraphQLServiceProvider } from './GraphQLServiceProvider';
import { createDefaultGraphQLService } from '..';
import { useConstant } from '../../utils/hooks/useConstant';

export function AppGraphQLServiceProvider({
  children,
  restoringCacheFallback,
}: {
  children: ReactNode;
  restoringCacheFallback?: ReactNode;
}) {
  const service = useConstant(() => createDefaultGraphQLService());

  return (
    <GraphQLServiceProvider
      value={service}
      restoringCacheFallback={restoringCacheFallback}
    >
      {children}
    </GraphQLServiceProvider>
  );
}
