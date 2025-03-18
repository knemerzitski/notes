import { renderHook } from '@testing-library/react';

import { ReactNode } from 'react';

import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';
import { CurrentUserIdProvider } from '../../../../src/user/components/CurrentUserIdProvider';

import { GraphQLService } from '../../../../src/graphql/types';
import { NoteIdProvider } from '../../../../src/note/context/note-id';
import { useUpdateOpenNoteSelectionRange } from '../../../../src/note/hooks/useUpdateOpenNoteSelectionRange';
import { SelectionRange } from '../../../../../collab/src/client/selection-range';

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
