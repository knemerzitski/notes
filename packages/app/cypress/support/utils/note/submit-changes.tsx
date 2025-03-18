import { renderHook } from '@testing-library/react';

import { ReactNode } from 'react';

import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';
import { CurrentUserIdProvider } from '../../../../src/user/components/CurrentUserIdProvider';

import { useUpdateNoteInsertRecord } from '../../../../src/note/hooks/useUpdateNoteInsertRecord';
import { CollabService } from '../../../../../collab/src/client/collab-service';
import { GraphQLService } from '../../../../src/graphql/types';
import { NoteIdProvider } from '../../../../src/note/context/note-id';

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

  collabService.submitChanges();
  const submittedRecord = collabService.submittedRecord;
  if (!submittedRecord) {
    return;
  }

  await insertRecord(noteId, submittedRecord);

  return;
}
