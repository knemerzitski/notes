import { ReactNode, createContext, useContext } from 'react';
import { CustomApolloClient, customApolloClient } from '../apollo-client';
import { ApolloProvider } from '@apollo/client';
import { PersistProvider } from '../hooks/usePersist';
import { StatsLinkProvider } from '../hooks/useStatsLink';
import { AddFetchResultErrorHandlerProvider } from '../hooks/useAddFetchResultErrorHandler';

const CustomApolloClientContext = createContext<CustomApolloClient | null>(null);

export function useCustomApolloClient() {
  const ctx = useContext(CustomApolloClientContext);
  if (ctx === null) {
    throw new Error(
      'useCustomApolloClient() requires context CustomApolloClientProvider'
    );
  }
  return ctx;
}

interface CustomApolloClientProviderProps {
  client: CustomApolloClient;
  children: ReactNode;
}

export default function CustomApolloClientProvider({
  client: customClient,
  children,
}: CustomApolloClientProviderProps) {
  return (
    <CustomApolloClientContext.Provider value={customClient}>
      <ApolloProvider client={customClient.client}>
        <PersistProvider persistor={customApolloClient.persistor}>
          <StatsLinkProvider statsLink={customApolloClient.statsLink}>
            <AddFetchResultErrorHandlerProvider errorLink={customApolloClient.errorLink}>
              {children}
            </AddFetchResultErrorHandlerProvider>
          </StatsLinkProvider>
        </PersistProvider>
      </ApolloProvider>
    </CustomApolloClientContext.Provider>
  );
}
