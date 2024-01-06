import { matchRoutes, useLocation } from 'react-router-dom';

import { useRouter } from '../RouterProvider';

export default function useBackgroundPath() {
  const { modalRoutes } = useRouter();
  const location = useLocation();

  const matchedModalRoutes = matchRoutes(modalRoutes, location);
  if (matchedModalRoutes && matchedModalRoutes.length > 0) {
    const route = matchedModalRoutes[matchedModalRoutes.length - 1].route;
    return route.backgroundPath;
  }
}
