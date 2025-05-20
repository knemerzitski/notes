import { gql } from '@apollo/client';

import { CollabService } from '../../../../../collab/src';

import { Note, NoteTextFieldName, User } from '../../../../src/__generated__/graphql';
import { GraphQLService } from '../../../../src/graphql/types';

import { NoteTextFieldEditor } from '../../../../src/note/types';

const Test_CreateCollabService_Query = gql(`
  query Test_CreateCollabService_Query($userBy: UserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        collabService
        textFields {
          name
          editor
        }
      }
    }
  }
`);

export function createCollabService({
  userId,
  noteId,
  graphQLService,
}: {
  graphQLService: GraphQLService;
  userId: User['id'];
  noteId: Note['id'];
}) {
  const data = graphQLService.client.cache.readQuery<{
    signedInUser: {
      id: string;
      noteLink: {
        id: string;
        collabService: CollabService;
        textFields: { name: NoteTextFieldName; editor: NoteTextFieldEditor }[];
      };
    };
  }>({
    query: Test_CreateCollabService_Query,
    variables: {
      userBy: {
        id: userId,
      },
      noteBy: {
        id: noteId,
      },
    },
  });

  if (!data) {
    throw new Error(`Unexpected null data when createCollabService for note "${noteId}"`);
  }

  return {
    collabService: data.signedInUser.noteLink.collabService,
    fields: Object.fromEntries(
      data.signedInUser.noteLink.textFields.map(({ name, editor }) => [name, editor])
    ) as Record<NoteTextFieldName, NoteTextFieldEditor>,
  };
}
