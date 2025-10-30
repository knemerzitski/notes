import { ObjectId, SearchIndexDescription } from 'mongodb';

import { array, Infer, InferRaw, instance, object, optional, string } from 'superstruct';

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

  /**
   * ID used for demo purposes to identify different demo notes
   */
  demoId: optional(string()),
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
    {
      key: {
        demoId: 1,
      },
      unique: true,
      sparse: true,
    },
  ],
};

export enum NoteSearchIndexName {
  COLLAB_TEXT_HEAD_TEXT = 'collabText',
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
          // collabTexts headRecord.text
          collabText: {
            type: 'document',
            fields: {
              headRecord: {
                type: 'document',
                fields: {
                  text: {
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
