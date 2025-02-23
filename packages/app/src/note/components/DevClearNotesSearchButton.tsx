import { lazy } from 'react';
import { isDevToolsEnabled } from '../../dev/utils/dev-tools';

export const DevClearNotesSearchButton = isDevToolsEnabled()
  ? lazy(() =>
      import('./ClearNotesSearchButton').then((res) => ({
        default: res.ClearNotesSearchButton,
      }))
    )
  : () => null;
