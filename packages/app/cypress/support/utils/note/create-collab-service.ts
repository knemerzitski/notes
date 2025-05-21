import { Note, User } from '../../../../src/__generated__/graphql';
import { GraphQLService } from '../../../../src/graphql/types';

import { NoteTextFieldEditor, NoteTextFieldName } from '../../../../src/note/types';
import { getUserNoteLinkId } from '../../../../src/note/utils/id';

export async function createCollabService({
  userId,
  noteId,
  graphQLService,
}: {
  graphQLService: GraphQLService;
  userId: User['id'];
  noteId: Note['id'];
}) {
  const collabManager = graphQLService.moduleContext.note.collabManager;

  const fieldCollab = (
    await collabManager.loadOrCreate(getUserNoteLinkId(noteId, userId))
  ).fieldCollab;

  return {
    collabService: fieldCollab.service,
    fields: Object.fromEntries(
      Object.values(NoteTextFieldName).map((field) => [
        field,
        fieldCollab.getField(field),
      ])
    ) as Record<NoteTextFieldName, NoteTextFieldEditor>,
  };
}
