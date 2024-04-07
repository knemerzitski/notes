import DataLoader from 'dataloader';
import { UserNoteModel } from '../../../mongoose/models/user-note';
import {
  Projection,
  ProjectionResult,
  mergeProjections,
} from '../../../mongoose/query-builder';
import { NoteQueryType } from '../mongo-query-mapper/note';
import userNotesArray from '../../../mongoose/operations/userNotesArray';

interface LoaderKey {
  notePublicId: string;
  query: Projection<NoteQueryType>;
}

export default class NotesLoader {
  private userNoteModel: UserNoteModel;

  constructor(userNoteModel: UserNoteModel) {
    this.userNoteModel = userNoteModel;
  }

  private loader = new DataLoader<LoaderKey, ProjectionResult<NoteQueryType>>(
    async (keys) => {
      const allPublicIds = keys.map(({ notePublicId }) => notePublicId);

      const mergedQuery = mergeProjections(
        {},
        keys.map(({ query }) => query)
      );

      const result = await this.userNoteModel.aggregate([
        {
          $match: {
            'note.publicId': {
              $in: allPublicIds,
            },
          },
        },
        // TODO userNotesArray separate for one, from lookup, $unwind is already done...
        // ...userNotesArray({
        //   fieldPath: 'order',
        //   noteTextFields: Object.values(TextFields),
        //   collectionNames: {
        //     userNote: UserNote.collection.collectionName,
        //     note: Note.collection.collectionName,
        //     collaborativeDocument: CollaborativeDocument.collection.collectionName,
        //   },
        //   lookupNote: true,
        //   collaborativeDocumentPipeline: [
        //     {
        //       $project: projectCollaborativeDocument({
        //         headDocument: true,
        //       }),
        //     },
        //   ],
        // }),
      ]);
    }
  );

  load();
}
