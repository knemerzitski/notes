import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { gql } from '../../../__generated__/gql';
import { NoteTextField } from '../../../__generated__/graphql';

const QUERY_IDS = gql(`
  query UseCreateLocalNoteGetIds  {
    nextLocalNoteId
    nextLocalCollabTextId
  }
`);

const QUERY_CREATE = gql(`
  query UseCreateLocalNote($id: ID!)  {
    localNote(id: $id){
      id
      __typename
      textFields {
        key
        value {
          id
          __typename
        }
      }
    }
    nextLocalNoteId
    nextLocalCollabTextId
  }
`);

export default function useCreateLocalNote() {
  const apolloClient = useApolloClient();

  return useCallback(() => {
    const ids = apolloClient.readQuery({
      query: QUERY_IDS,
    });
    if (!ids) {
      throw new Error('Expected IDs in cache to create local note');
    }
    let { nextLocalNoteId, nextLocalCollabTextId } = ids;

    const note = {
      id: nextLocalNoteId++,
      __typename: 'LocalNote' as const,
      textFields: [
        {
          key: NoteTextField.Title,
          value: {
            id: nextLocalCollabTextId++,
            __typename: 'LocalCollabText' as const,
          },
        },
        {
          key: NoteTextField.Content,
          value: {
            id: nextLocalCollabTextId++,
            __typename: 'LocalCollabText' as const,
          },
        },
      ],
    };

    apolloClient.writeQuery({
      query: QUERY_CREATE,
      variables: {
        id: String(note.id),
      },
      data: {
        localNote: note,
        nextLocalCollabTextId,
        nextLocalNoteId,
      },
    });

    return note;
  }, [apolloClient]);
}
