import { ObjectId, SearchIndexDescription } from 'mongodb';

import { CollectionDescription } from '../collections';
import { NoteUserSchema } from './note-user';
import { ShareNoteLinkSchema } from './share-note-link';
import { CollabSchema } from './collab';

export interface NoteSchema {
  _id: ObjectId;
  /**
   * User specific info for this note
   */
  users: NoteUserSchema[];
  /**
   * Note collaborative schema
   */
  collab?: CollabSchema;
  /**
   * Note sharing via links
   */
  shareNoteLinks?: ShareNoteLinkSchema[];
}

export const noteDescription: CollectionDescription = {
  indexSpecs: [
    {
      key: { 'users._id': 1, _id: 1 },
      unique: true,
    },
    {
      key: { 'shareNoteLinks.publicId': 1 },
      sparse: true,
      unique: true,
    },
  ],
};

export enum NoteSearchIndexName {
  COLLAB_TEXTS_HEAD_TEXT = 'collabTextsHeadText',
}

export const noteSearchIndexDescriptions: SearchIndexDescription[] = [
  {
    name: NoteSearchIndexName.COLLAB_TEXTS_HEAD_TEXT,
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
          collabTexts: {
            type: 'document',
            fields: {
              v: {
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
    },
  },
];
