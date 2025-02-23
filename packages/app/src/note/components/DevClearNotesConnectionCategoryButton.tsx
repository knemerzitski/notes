import { lazy } from 'react';
import { isDevToolsEnabled } from '../../dev/utils/dev-tools';

export const DevClearNotesConnectionCategoryButton = isDevToolsEnabled()
  ? lazy(() =>
      import('./ClearNotesConnectionCategoryButton').then((res) => ({
        default: res.ClearNotesConnectionCategoryButton,
      }))
    )
  : () => null;
