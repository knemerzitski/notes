import { ApolloProvider } from '@apollo/client';
import { ReactNode, createContext, useContext } from 'react';

import { CustomApolloClient } from '../custom-apollo-client';
import { AddFetchResultErrorHandlerProvider } from '../hooks/use-add-fetch-result-error-handler';
import { PersistProvider } from '../hooks/use-persist';
import { StatsLinkProvider } from '../hooks/use-stats-link';

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

export function CustomApolloClientProvider({
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
