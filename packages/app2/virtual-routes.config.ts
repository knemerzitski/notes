import { index, layout, rootRoute, route } from '@tanstack/virtual-file-routes';

export const virtualRouteConfig = rootRoute('root.tsx', [
  index('index.tsx'),
  layout('my_layout', 'layout.tsx', [
    route('/note', 'note.tsx', [index('note-index.tsx')]),
  ]),
]);
