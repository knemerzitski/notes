import { renderHook } from '@testing-library/react';

import { ReactNode } from 'react';

import { SelectionRange } from '../../../../../collab/src/client/selection-range';

import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';

import { GraphQLService } from '../../../../src/graphql/types';
import { NoteIdProvider } from '../../../../src/note/context/note-id';
import { useUpdateOpenNoteSelectionRange } from '../../../../src/note/hooks/useUpdateOpenNoteSelectionRange';
import { CurrentUserIdProvider } from '../../../../src/user/components/CurrentUserIdProvider';

export async function updateOpenNoteSelectionRange({
  noteId,
  graphQLService,
  revision,
  selectionRange,
}: {
  noteId: string;
  graphQLService: GraphQLService;
  selectionRange: SelectionRange;
  revision: number;
}) {
  const {
    result: { current: updateOpenNoteSelectionRange },
  } = renderHook(() => useUpdateOpenNoteSelectionRange(), {
    wrapper: ({ children }: { children: ReactNode }) => {
      return (
        <GraphQLServiceProvider service={graphQLService}>
          <CurrentUserIdProvider>
            <NoteIdProvider noteId={noteId}>{children}</NoteIdProvider>
          </CurrentUserIdProvider>
        </GraphQLServiceProvider>
      );
    },
  });

  await updateOpenNoteSelectionRange({
    note: {
      id: noteId,
    },
    revision,
    selectionRange,
  });
}
