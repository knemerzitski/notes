 
import { renderHook } from '@testing-library/react';

import { ReactNode } from 'react';

import { Selection } from '../../../../../collab2/src';

import { getFragmentData } from '../../../../src/__generated__';
import {
  CreateNotePayloadFragmentDoc,
  NoteTextFieldName,
} from '../../../../src/__generated__/graphql';
import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';

import { useMutation } from '../../../../src/graphql/hooks/useMutation';
import { GraphQLService } from '../../../../src/graphql/types';
import { CreateNote } from '../../../../src/note/mutations/CreateNote';
import { CurrentUserIdProvider } from '../../../../src/user/components/CurrentUserIdProvider';

export async function createNote({
  graphQLService,
  userId,
  initialText,
}: {
  graphQLService: GraphQLService;
  userId: string;
  initialText?: Partial<Record<NoteTextFieldName, string>>;
}) {
  const {
    result: {
      current: [createNote],
    },
  } = renderHook(() => useMutation(CreateNote), {
    wrapper: ({ children }: { children: ReactNode }) => {
      return (
        <GraphQLServiceProvider service={graphQLService}>
          <CurrentUserIdProvider>{children}</CurrentUserIdProvider>
        </GraphQLServiceProvider>
      );
    },
  });

  const externalState =
    graphQLService.typePoliciesContext.custom.userNoteLink.externalState.newValue(
      undefined,
      {
        userId,
      }
    );
  if (initialText) {
    Object.entries(initialText).forEach(([key, value]) => {
      externalState.fields[key as NoteTextFieldName].editor.insert(
        value,
        Selection.create(0)
      );
    });
  }

  const { data } = await createNote({
    variables: {
      input: {
        authUser: {
          id: userId,
        },
        collabText: {
          initialText: externalState.service.viewText,
          insertToTail: true,
        },
      },
    },
  });

  if (!data) {
    throw new Error('createNote: no response data');
  }

  const payload = getFragmentData(CreateNotePayloadFragmentDoc, data.createNote);

  const noteId = payload.userNoteLink.note.id;

  return {
    noteId,
  };
}
