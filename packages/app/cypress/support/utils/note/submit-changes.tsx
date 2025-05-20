import { renderHook } from '@testing-library/react';

import { ReactNode } from 'react';

import { CollabService } from '../../../../../collab/src';

import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';
import { GraphQLService } from '../../../../src/graphql/types';
import { NoteIdProvider } from '../../../../src/note/context/note-id';
import { useUpdateNoteInsertRecord } from '../../../../src/note/hooks/useUpdateNoteInsertRecord';
import { CurrentUserIdProvider } from '../../../../src/user/components/CurrentUserIdProvider';

export async function submitChanges({
  noteId,
  graphQLService,
  collabService,
}: {
  noteId: string;
  graphQLService: GraphQLService;
  collabService: CollabService;
}) {
  const {
    result: { current: insertRecord },
  } = renderHook(() => useUpdateNoteInsertRecord(), {
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

  // wait for submit to be done then do after..

  const submittedRecord = collabService.submitChanges();
  if (!submittedRecord) {
    return;
  }

  await insertRecord(noteId, submittedRecord);

  return;
}
