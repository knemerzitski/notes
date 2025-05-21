import { ApolloProvider } from '@apollo/client';
import { ReactNode } from 'react';

import { CollabServiceManagerProvider } from '../../note/context/collab-service-manager';
import { PersistorProvider } from '../../persistence/context/persistor';

import { RestorerProvider } from '../../persistence/context/restorer';
import { GetMutationUpdaterFnProvider } from '../context/get-mutation-updater-fn';
import { PersistLinkProvider } from '../context/persist-link';
import { StatsLinkProvider } from '../context/stats-link';
import { GraphQLService } from '../types';

import { RestoreCache } from './RestoreCache';
import { ResumePersistedOngoingOperations } from './ResumePersistedOngoingOperations';

export function GraphQLServiceProvider({
  service,
  children,
  restoringCacheFallback,
}: {
  service: GraphQLService;
  children: ReactNode;
  restoringCacheFallback?: ReactNode;
}) {
  return (
    <ApolloProvider client={service.client}>
      <GetMutationUpdaterFnProvider getter={service.mutationUpdaterFnMap.get}>
        <PersistLinkProvider persistLink={service.links.persistLink}>
          <StatsLinkProvider statsLink={service.links.statsLink}>
            <PersistorProvider persistor={service.persistor}>
              <RestorerProvider restorer={service.restorer}>
                <RestoreCache fallback={restoringCacheFallback}>
                  <ResumePersistedOngoingOperations />
                  <CollabServiceManagerProvider
                    context={service.moduleContext.note.collabManager}
                  >
                    {children}
                  </CollabServiceManagerProvider>
                </RestoreCache>
              </RestorerProvider>
            </PersistorProvider>
          </StatsLinkProvider>
        </PersistLinkProvider>
      </GetMutationUpdaterFnProvider>
    </ApolloProvider>
  );
}
