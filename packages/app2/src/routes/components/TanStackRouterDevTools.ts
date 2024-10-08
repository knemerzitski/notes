import React from 'react';

/**
 * @source {@link https://tanstack.com/router/v1/docs/framework/react/devtools}
 */
export const TanStackRouterDevtools =
  process.env.NODE_ENV === 'production'
    ? () => null // Render nothing in production
    : React.lazy(() =>
        // Lazy load in development
        import('@tanstack/router-devtools').then((res) => ({
          default: res.TanStackRouterDevtools,
        }))
      );
