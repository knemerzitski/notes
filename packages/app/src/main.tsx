import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './app';

declare global {
  // eslint-disable-next-line no-var
  var __DEV__: boolean | undefined;
}

if (import.meta.env.PROD) {
  // In production `__DEV__` is `undefined`.
  // `@apollo/client` code uses expression `globalThis.__DEV__ !== false`
  // and will keep using freeze/clone in ApolloCache. Line below fixes it.
  globalThis.__DEV__ = false;
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
