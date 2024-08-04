import { ObjectId, SearchIndexDescription } from 'mongodb';
import { nanoid } from 'nanoid';

import { CollectionDescription } from '../../collections';
import { Entry } from '../../types';
import { CollabTextSchema } from '../collab-text/collab-text';

import { ShareNoteLinkSchema } from './share-note-link';
import { UserNoteSchema } from './user-note';

export interface NoteSchema {
  _id: ObjectId;
  /**
   * Unique generated ID used to access note
   */
  publicId: string;
  /**
   * User specific info for this note
   */
  userNotes: UserNoteSchema[];
  /**
   * Collaborative editing texts by field name.
   * Using array instead of map for easier indexing. \
   * GraphQL uses enum NoteTextField for key.
   */
  collabTexts?: Entry<string, CollabTextSchema>[];
  /**
   * Note sharing via links
   */
  shareNoteLinks?: ShareNoteLinkSchema[];
}

export const noteDefaultValues = {
  publicId: () => nanoid(64),
};

export const noteDescription: CollectionDescription = {
  indexSpecs: [
    {
      key: { publicId: 1 },
      unique: true,
    },
    {
      key: { 'userNotes.userId': 1, publicId: 1 },
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
          // Filter note by userNotes.userId
          userNotes: {
            type: 'document',
            fields: {
              userId: {
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
