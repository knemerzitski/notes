import { CollectionName, MongoDBCollectionsOnlyNames } from '../../../collections';
import { DeepAnyDescription } from '../../../query/description';
import { AddStagesResolver } from '../../../query/merged-query-to-pipeline';
import { CollabTextSchema } from '../../collab-text/collab-text';
import { collabTextDescription } from '../../collab-text/query/collab-text';
import { NoteSchema } from '../note';

export type QueryableNote = Omit<NoteSchema, 'collabTexts'> & {
  collabTexts?: Record<
    NonNullable<NoteSchema['collabTexts']>[0]['k'],
    NonNullable<NoteSchema['collabTexts']>[0]['v']
  >;
};

export interface QueryableNoteContext {
  collections: Pick<MongoDBCollectionsOnlyNames, CollectionName.NOTES>;
}

export const queryableNoteDescription: DeepAnyDescription<QueryableNote> = {
  collabTexts: {
    $addStages({
      fields,
    }: Parameters<AddStagesResolver<Record<string, CollabTextSchema>>>[0]) {
      // collabTexts array into object
      return [
        {
          $set: Object.fromEntries(
            fields.map(({ relativePath }) => [
              relativePath,
              {
                $arrayToObject: `$${relativePath}`,
              },
            ])
          ),
        },
      ];
    },
    $anyKey: collabTextDescription,
  },
  $mapLastProject(query) {
    return {
      _id: query._id ?? 0,
    };
  },
};
