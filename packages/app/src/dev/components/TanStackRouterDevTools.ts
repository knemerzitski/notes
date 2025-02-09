import { lazy } from 'react';

import { isDevToolsEnabled } from '../utils/dev-tools';

/**
 * @source {@link https://tanstack.com/router/v1/docs/framework/react/devtools}
 */
export const TanStackRouterDevtools = isDevToolsEnabled()
  ? lazy(() =>
      import('@tanstack/router-devtools').then((res) => ({
        default: res.TanStackRouterDevtools,
      }))
    )
  : () => null;
