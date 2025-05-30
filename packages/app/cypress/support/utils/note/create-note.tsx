import { renderHook } from '@testing-library/react';

import { ReactNode } from 'react';

import { Selection } from '../../../../../collab/src';

import { getFragmentData } from '../../../../src/__generated__';
import { CreateNotePayloadFragmentDoc } from '../../../../src/__generated__/graphql';
import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';

import { useMutation } from '../../../../src/graphql/hooks/useMutation';
import { GraphQLService } from '../../../../src/graphql/types';
import { CreateNote } from '../../../../src/note/mutations/CreateNote';
import { NoteTextFieldName } from '../../../../src/note/types';
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

  const collabManager = graphQLService.moduleContext.note.collabManager;
  const fieldCollab = collabManager.newInstance();

  if (initialText) {
    Object.entries(initialText).forEach(([key, value]) => {
      fieldCollab.getField(key as NoteTextFieldName).insert(value, Selection.create(0));
    });
  }

  const { data } = await createNote({
    variables: {
      input: {
        authUser: {
          id: userId,
        },
        collabText: {
          initialText: fieldCollab.service.viewText,
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
