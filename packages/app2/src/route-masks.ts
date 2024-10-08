import { AnyRoute, RouteMask } from '@tanstack/react-router';

export function createRouteMasks<TRouteTree extends AnyRoute>(
  _routeTree: TRouteTree
): RouteMask<TRouteTree>[] {
  return [
    // TODO empty for now
    // createRouteMask({
    //   routeTree,
    //   from: '/notes/$noteId/modal',
    //   to: '/note/$noteId',
    //   params: (prev) => ({
    //     noteId: prev.noteId,
    //   }),
    // }),
  ];
}
