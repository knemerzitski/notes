import { ObjectId, SearchIndexDescription } from 'mongodb';

import { array, Infer, InferRaw, instance, object, optional } from 'superstruct';

import { CollectionDescription } from '../collections';

import { CollabTextSchema } from './collab-text';
import { NoteUserSchema } from './note-user';
import { ShareNoteLinkSchema } from './share-note-link';

export const NoteSchema = object({
  _id: instance(ObjectId),
  /**
   * One to many relationship between note and user.
   */
  users: array(NoteUserSchema),
  /**
   * Note collaborative text
   */
  collabText: optional(CollabTextSchema),

  shareLinks: optional(array(ShareNoteLinkSchema)),
});

export type DBNoteSchema = InferRaw<typeof NoteSchema>;

export type NoteSchema = Infer<typeof NoteSchema>;

export const noteDescription: CollectionDescription = {
  indexSpecs: [
    {
      key: { 'users._id': 1, _id: 1 },
      unique: true,
    },
    {
      key: { 'shareLinks._id': 1 },
      sparse: true,
      unique: true,
    },
  ],
};

export enum NoteSearchIndexName {
  COLLAB_TEXT_HEAD_TEXT = 'collabTextHeadText',
}

export const noteSearchIndexDescriptions: SearchIndexDescription[] = [
  {
    name: NoteSearchIndexName.COLLAB_TEXT_HEAD_TEXT,
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          // Filter note by users._id
          users: {
            type: 'document',
            fields: {
              _id: {
                type: 'objectId',
              },
            },
          },
          // collabTexts headText changeset string value
          collabText: {
            type: 'document',
            fields: {
              headText: {
                type: 'document',
                fields: {
                  changeset: {
                    type: 'string',
                    analyzer: 'lucene.english',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
];
