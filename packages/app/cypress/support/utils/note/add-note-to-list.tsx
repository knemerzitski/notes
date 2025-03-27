import { GraphQLService } from '../../../../src/graphql/types';
import { addNoteToConnection } from '../../../../src/note/models/note-connection/add';
import { getUserNoteLinkId } from '../../../../src/note/utils/id';
import { getCurrentUserId } from '../../../../src/user/models/signed-in-user/get-current';

export function addNoteToList({
  noteId,
  graphQLService,
}: {
  noteId: string;
  graphQLService: GraphQLService;
}) {
  addNoteToConnection(
    {
      userNoteLinkId: getUserNoteLinkId(
        noteId,
        getCurrentUserId(graphQLService.client.cache)
      ),
    },
    graphQLService.client.cache
  );
}
