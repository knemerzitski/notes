/* eslint-disable unicorn/filename-case */
import { ReactNode } from 'react';
import { GraphQLServiceProvider } from './GraphQLServiceProvider';
import { createDefaultGraphQLService } from '../../graphql-service';
import { useConstant } from '../../utils/hooks/useConstant';

export function AppGraphQLModuleProvider({
  children,
  restoringCacheFallback,
}: {
  children: ReactNode;
  /**
   * Component to render while cache as not been restored
   */
  restoringCacheFallback?: ReactNode;
}) {
  const service = useConstant(() => createDefaultGraphQLService());

  return (
    <GraphQLServiceProvider
      service={service}
      restoringCacheFallback={restoringCacheFallback}
    >
      {children}
    </GraphQLServiceProvider>
  );
}
