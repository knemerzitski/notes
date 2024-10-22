import { createRouteMask } from '@tanstack/react-router';
import { routeTree as generatedRouteTree } from './__generated__/routeTree.gen';

export function createRouteMasks(routeTree: typeof generatedRouteTree) {
  return [
    createRouteMask({
      routeTree: routeTree,
      from: '/notes',
      to: '/',
    }),
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
