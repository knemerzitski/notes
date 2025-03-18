import { Note, NoteTextFieldName } from '../../../../src/__generated__/graphql';
import { __unstable_readNoteExternalState } from '../../../../src/note/policies/Note/_external';
import { SimpleText } from '../../../../../collab/src/types';
import { GraphQLService } from '../../../../src/graphql/types';

export function createCollabService({
  noteId,
  graphQLService,
}: {
  graphQLService: GraphQLService;
  noteId: Note['id'];
}) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const noteExternalState = __unstable_readNoteExternalState(
    {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      __ref: graphQLService.client.cache.identify({
        __typename: 'Note',
        id: noteId,
      })!,
    },
    graphQLService.client.cache
  )!;

  return {
    collabService: noteExternalState.service,
    fields: Object.fromEntries(
      Object.entries(noteExternalState.fields).map(([key, value]) => [key, value.editor])
    ) as Record<NoteTextFieldName, SimpleText>,
  };
}
