import { ReactNode, createContext, useContext } from 'react';
import { CustomApolloClient } from '../apollo-client';

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
  client,
  children,
}: CustomApolloClientProviderProps) {
  return (
    <CustomApolloClientContext.Provider value={client}>
      {children}
    </CustomApolloClientContext.Provider>
  );
}
