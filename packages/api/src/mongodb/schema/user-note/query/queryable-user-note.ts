import { MongoDBCollectionsOnlyNames } from '../../../collections';
import { DeepAnyDescription } from '../../../query/description';
import { collabTextDescription } from '../../collab-text/query/collab-text';
import { UserNoteSchema } from '../user-note';

import userNote_noteLookup, { UserNote_NoteLookup } from './userNote_noteLookup';

export type QueryableUserNote = UserNoteSchema & UserNote_NoteLookup;

export interface QueryableUserNoteContext {
  collections: MongoDBCollectionsOnlyNames;
}

export const queryableUserNoteDescription: DeepAnyDescription<
  QueryableUserNote,
  unknown,
  QueryableUserNoteContext
> = {
  note: {
    $addStages({
      fields,
      subStages: innerStages,
      subLastProject: innerLastProject,
      customContext,
    }) {
      // Don't $lookup if only querying for _id or publicId since UserNote already has it
      const idAndPublicId = ['_id', 'publicId'];
      const isQueryingOnlyIdOrPublicId = !fields.some((field) => {
        const keys = Object.keys(field.query);
        if (keys.length > 2) {
          return true; // Has more then _id or publicId
        }
        return keys.some((key) => !idAndPublicId.includes(key));
      });
      if (isQueryingOnlyIdOrPublicId) {
        return;
      }

      return userNote_noteLookup({
        pipeline: [
          ...innerStages(),
          {
            $project: innerLastProject(),
          },
        ],
        collectionName: customContext.collections.notes.collectionName,
      });
    },
    collabTexts: {
      $anyKey: collabTextDescription,
    },
  },
  $mapLastProject(query) {
    return {
      _id: query._id ?? 0,
    };
  },
};
