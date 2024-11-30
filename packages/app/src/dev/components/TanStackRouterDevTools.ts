import { lazy } from 'react';

/**
 * @source {@link https://tanstack.com/router/v1/docs/framework/react/devtools}
 */
export const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null // Render nothing in production
  : lazy(() =>
      // Lazy load in development
      import('@tanstack/router-devtools').then((res) => ({
        default: res.TanStackRouterDevtools,
      }))
    );
