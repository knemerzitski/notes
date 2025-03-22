import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { SubmittedRecord } from '../../../../collab/src/client/submitted-record';

import { Note } from '../../__generated__/graphql';
import { useMutation } from '../../graphql/hooks/useMutation';
import { PersistLink } from '../../graphql/link/persist';
import { hasOngoingOperation } from '../../graphql/link/persist/has';
import { noteSerializationKey_fieldText } from '../../graphql/utils/serialization-key';
import { useUserId } from '../../user/context/user-id';
import { UpdateNoteInsertRecord } from '../mutations/UpdateNoteInsertRecord';
import { getCollabTextId } from '../utils/id';
import { submittedRecordToCollabTextRecordInput } from '../utils/map-record';

export function useUpdateNoteInsertRecord() {
  const client = useApolloClient();
  const userId = useUserId();

  const [updateNoteInsertRecord] = useMutation(UpdateNoteInsertRecord);

  return useCallback(
    async (noteId: Note['id'], submittedRecord: SubmittedRecord) => {
      const operationId = `CollabText:${getCollabTextId(noteId)}.newRecord:${submittedRecord.userGeneratedId}`;

      if (hasOngoingOperation(operationId, client.cache)) {
        // Cancel insert record if same record has already been submitted
        return false;
      }

      return updateNoteInsertRecord({
        // This mutation will never be called with a local note
        variables: {
          input: {
            authUser: {
              id: userId,
            },
            note: {
              id: noteId,
            },
            insertRecord: submittedRecordToCollabTextRecordInput(submittedRecord),
          },
        },
        context: {
          [PersistLink.PERSIST]: operationId,
          serializationKey: noteSerializationKey_fieldText(noteId, userId),
        },
        errorPolicy: 'all',
      });
    },
    [updateNoteInsertRecord, client, userId]
  );
}
