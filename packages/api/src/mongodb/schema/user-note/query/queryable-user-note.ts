import { CollectionName, MongoDBCollections } from '../../../collections';
import { MongoDBContext } from '../../../lambda-context';
import { DeepAnyDescription } from '../../../query/description';
import { collabTextDescription } from '../../collab-text/query/collab-text';
import { UserNoteSchema } from '../user-note';

import userNote_noteLookup, { UserNote_NoteLookup } from './userNote_noteLookup';
import userNote_shareNoteLinkLookup, {
  UserNote_ShareNoteLinksLookup,
} from './userNote_shareNoteLinkLookup';

export type QueryableUserNote = UserNoteSchema &
  UserNote_NoteLookup &
  UserNote_ShareNoteLinksLookup;

export interface QueryableUserNoteContext {
  collections: {
    [CollectionName.NOTES]: Pick<
      MongoDBContext<MongoDBCollections>['collections'][CollectionName.NOTES],
      'collectionName'
    >;
    [CollectionName.SHARE_NOTE_LINKS]: Pick<
      MongoDBContext<MongoDBCollections>['collections'][CollectionName.SHARE_NOTE_LINKS],
      'collectionName'
    >;
  };
}

// function that wraps resolvers from item to items

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
        collectionName: customContext.collections[CollectionName.NOTES].collectionName,
      });
    },
    collabTexts: {
      $anyKey: collabTextDescription,
    },
  },
  shareNoteLinks: {
    $addStages({
      subStages: innerStages,
      subLastProject: innerLastProject,
      customContext,
    }) {
      return userNote_shareNoteLinkLookup({
        pipeline: [
          ...innerStages(),
          {
            $project: innerLastProject(),
          },
        ],
        collectionName:
          customContext.collections[CollectionName.SHARE_NOTE_LINKS].collectionName,
      });
    },
    $mapLastProject(query) {
      return query.$query;
    },
  },
  $mapLastProject(query) {
    return {
      _id: query._id ?? 0,
    };
  },
};
