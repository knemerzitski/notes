import { gql } from '@apollo/client';

import { CollabService } from '../../../../../collab/src/client/collab-service';
import { SimpleText } from '../../../../../collab/src/types';

import { Note, NoteTextFieldName } from '../../../../src/__generated__/graphql';
import { GraphQLService } from '../../../../src/graphql/types';

import { NoteTextFieldEditor } from '../../../../src/note/types';

const Test_CreateCollabService_Query = gql(`
  query Test_CreateCollabService_Query($by: NoteByInput!) {
    note(by: $by) {
      id
      collabService
      textFields {
        name
        editor
      }
    }
  }
`);

export function createCollabService({
  noteId,
  graphQLService,
}: {
  graphQLService: GraphQLService;
  noteId: Note['id'];
}) {
  const data = graphQLService.client.cache.readQuery<{
    note: {
      id: string;
      collabService: CollabService;
      textFields: { name: NoteTextFieldName; editor: NoteTextFieldEditor }[];
    };
  }>({
    query: Test_CreateCollabService_Query,
    variables: {
      by: {
        id: noteId,
      },
    },
  });

  if (!data) {
    throw new Error(`Unexpected null data when createCollabService for note "${noteId}"`);
  }

  return {
    collabService: data.note.collabService,
    fields: Object.fromEntries(
      data.note.textFields.map(({ name, editor }) => [name, editor])
    ) as Record<NoteTextFieldName, SimpleText>,
  };
}
