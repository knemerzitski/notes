import { GraphQLError } from "graphql";
import { GraphQLErrorCode, ResourceType } from "~api-app-shared/graphql/error-codes";
import { NoteNotFoundError } from "../../services/note/errors";
import { objectIdToStr } from "../../mongodb/utils/objectid";

export function formatError(error: unknown) {
  if (error instanceof NoteNotFoundError) {
    return new GraphQLError(`Note '${objectIdToStr(error.noteId)}' not found`, {
      extensions: {
        code: GraphQLErrorCode.NOT_FOUND,
        resource: ResourceType.NOTE,
      },
    });
  }

  return;
}
