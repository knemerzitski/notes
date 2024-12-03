/* eslint-disable unicorn/filename-case */
import { ReactNode } from 'react';

import { createDefaultGraphQLService } from '../../graphql-service';

import { GraphQLServiceProvider } from './GraphQLServiceProvider';

const service = createDefaultGraphQLService();

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
  return (
    <GraphQLServiceProvider
      service={service}
      restoringCacheFallback={restoringCacheFallback}
    >
      {children}
    </GraphQLServiceProvider>
  );
}
