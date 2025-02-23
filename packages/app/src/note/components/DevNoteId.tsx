import { lazy } from 'react';

import { isDevToolsEnabled } from '../../dev/utils/dev-tools';

export const DevNoteId = isDevToolsEnabled()
  ? lazy(() =>
      import('./NoteId').then((res) => ({
        default: res.NoteId,
      }))
    )
  : () => null;
