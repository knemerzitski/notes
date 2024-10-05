/* eslint-disable unicorn/filename-case */
import { ReactNode, useRef } from 'react';
import { GraphQLServiceProvider } from './GraphQLServiceProvider';
import { createDefaultGraphQLService } from '..';

export function AppGraphQLServiceProvider({ children }: { children: ReactNode }) {
  const service = useRef(createDefaultGraphQLService());

  return (
    <GraphQLServiceProvider value={service.current}>{children}</GraphQLServiceProvider>
  );
}
