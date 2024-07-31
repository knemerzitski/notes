import { CollectionName, MongoDBCollectionsOnlyNames } from '../../../collections';
import { DeepAnyDescription } from '../../../query/description';
import { collabTextDescription } from '../../collab-text/query/collab-text';
import { NoteSchema } from '../note';

export type QueryableNote = NoteSchema;

export interface QueryableNoteContext {
  collections: Pick<MongoDBCollectionsOnlyNames, CollectionName.NOTES>;
}

export const queryableNoteDescription: DeepAnyDescription<QueryableNote> = {
  collabTexts: {
    $anyKey: collabTextDescription,
  },
  $mapLastProject(query) {
    return {
      _id: query._id ?? 0,
    };
  },
};
