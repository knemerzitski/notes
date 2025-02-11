import { index, layout, rootRoute, route } from '@tanstack/virtual-file-routes';

export const virtualRouteConfig = rootRoute('root.tsx', [
  index('index.tsx'),
  layout('root_layout', 'layout.tsx', [
    route('/notes', 'notes.tsx'),
    route('/archive', 'archive.tsx'),
    route('/trash', 'trash.tsx'),
    route('/search', 'search.tsx'),
    route('/about', 'about.tsx'),
  ]),
  route('/note/$noteId', 'note.tsx'),
  route('/note/sharing/$noteId', 'note-sharing.tsx'),
]);
