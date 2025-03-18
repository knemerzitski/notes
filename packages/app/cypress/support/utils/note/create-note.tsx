import { renderHook } from '@testing-library/react';

import { ReactNode } from 'react';

import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';
import { CurrentUserIdProvider } from '../../../../src/user/components/CurrentUserIdProvider';

import { CreateNote } from '../../../../src/note/mutations/CreateNote';
import { useMutation } from '../../../../src/graphql/hooks/useMutation';
import { getFragmentData } from '../../../../src/__generated__';
import {
  CreateNotePayloadFragmentDoc,
  NoteTextFieldName,
} from '../../../../src/__generated__/graphql';
import { GraphQLService } from '../../../../src/graphql/types';
import { NoteExternalState } from '../../../../src/note/external-state/note';
import { SelectionRange } from '../../../../../collab/src/client/selection-range';

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

  const externalState = new NoteExternalState();
  if (initialText) {
    Object.entries(initialText).forEach(([key, value]) => {
      externalState.fields[key as NoteTextFieldName].editor.insert(
        value,
        SelectionRange.from(0)
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
