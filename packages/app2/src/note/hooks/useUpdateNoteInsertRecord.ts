import { useCallback } from 'react';
import { useMutation } from '../../graphql/hooks/useMutation';
import { UpdateNoteInsertRecord } from '../mutations/UpdateNoteInsertRecord';
import { SubmittedRecord } from '~collab/client/submitted-record';
import { submittedRecordToCollabTextRecordInput } from '../utils/map-record';
import { Note } from '../../__generated__/graphql';
import { getCollabTextId } from '../utils/id';
import { PersistLink } from '../../graphql/link/persist';
import { hasOngoingOperation } from '../../graphql/link/persist/has';
import { useApolloClient } from '@apollo/client';
import { noteSerializationKey } from '../../graphql/utils/serialization-key';
import { getCurrentUserId } from '../../user/models/signed-in-user/get-current';

export function useUpdateNoteInsertRecord() {
  const client = useApolloClient();
  const [updateNoteInsertRecord] = useMutation(UpdateNoteInsertRecord);

  return useCallback(
    async (noteId: Note['id'], submittedRecord: SubmittedRecord) => {
      const operationId = `CollabText:${getCollabTextId(noteId)}.newRecord:${submittedRecord.userGeneratedId}`;

      if (hasOngoingOperation(operationId, client.cache)) {
        // Cancel insert record if same record has already been submitted
        return false;
      }

      const userId = getCurrentUserId(client.cache);
      if (!userId) {
        throw new Error('Cannot trash note without current userId');
      }

      return updateNoteInsertRecord({
        // This mutation will never be called with a local note
        variables: {
          input: {
            noteId,
            insertRecord: submittedRecordToCollabTextRecordInput(submittedRecord),
          },
        },
        context: {
          [PersistLink.PERSIST]: operationId,
          serializationKey: noteSerializationKey(noteId, userId, 'insertText'),
        },
        errorPolicy: 'all',
      });
    },
    [updateNoteInsertRecord, client]
  );
}
