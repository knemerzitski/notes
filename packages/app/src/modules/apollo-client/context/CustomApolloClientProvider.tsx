import { ApolloProvider } from '@apollo/client';
import { ReactNode, createContext, useContext } from 'react';

import { CustomApolloClient } from '../custom-apollo-client';
import { AddFetchResultErrorHandlerProvider } from '../hooks/useAddFetchResultErrorHandler';
import { PersistProvider } from '../hooks/usePersist';
import { StatsLinkProvider } from '../hooks/useStatsLink';

const CustomApolloClientContext = createContext<CustomApolloClient | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
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
        <PersistProvider persistor={customClient.persistor}>
          <StatsLinkProvider statsLink={customClient.statsLink}>
            <AddFetchResultErrorHandlerProvider errorLink={customClient.errorLink}>
              {children}
            </AddFetchResultErrorHandlerProvider>
          </StatsLinkProvider>
        </PersistProvider>
      </ApolloProvider>
    </CustomApolloClientContext.Provider>
  );
}
