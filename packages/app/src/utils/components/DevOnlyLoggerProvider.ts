import { lazy } from 'react';

import { Passthrough } from './Passthrough';

export const DevOnlyLoggerProvider = import.meta.env.PROD
  ? Passthrough
  : lazy(() =>
      import('./DefaultLoggerProvider').then((res) => ({
        default: res.DefaultLoggerProvider,
      }))
    );
