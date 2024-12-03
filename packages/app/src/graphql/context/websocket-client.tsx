import { createContext, ReactNode, useContext } from 'react';

import { WebSocketClient } from '../ws/websocket-client';

type ProvidedWebSocketClient = Pick<WebSocketClient, 'restart'> | undefined;

const WebsSocketClientContext = createContext<ProvidedWebSocketClient | null>(null);

export function useWebSocketClient(): ProvidedWebSocketClient {
  const ctx = useContext(WebsSocketClientContext);
  if (ctx === null) {
    throw new Error('useWebSocketClient() requires context <WebSocketClientProvider>');
  }
  return ctx;
}

export function WebSocketClientProvider({
  wsClient,
  children,
}: {
  wsClient: ProvidedWebSocketClient;
  children: ReactNode;
}) {
  return (
    <WebsSocketClientContext.Provider value={wsClient}>
      {children}
    </WebsSocketClientContext.Provider>
  );
}
