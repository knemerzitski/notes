import { NoteMapper } from '../schema.mappers';
import { NoteTextField } from '../../types.generated';
import { DBUserNote } from '../../../mongoose/models/user-note';
import { MongoDocumentQuery } from '../../../mongoose/query-builder';
import { NotePreferencesQuery, NotePreferencesQueryType } from './note-preferences';
import {
  CollaborativeDocumentQuery,
  CollaborativeDocumentQueryType,
} from '../../collab/mongo-query-mapper/collaborative-document';
import { DBNote } from '../../../mongoose/models/note';

export type NoteQueryType<TCollabTextKey extends string = NoteTextField> = Omit<DBUserNote, 'preferences' | 'note' | 'userId'> & {
  preferences: NotePreferencesQueryType;
  note: Omit<DBUserNote['note'], 'collabText' | 'collabTextId'> & {
    collabText: Record<TCollabTextKey, CollaborativeDocumentQueryType>;
  } & Omit<DBNote, 'publicId' | 'collabTextId'>;
};

export class NoteQuery implements NoteMapper {
  private query: MongoDocumentQuery<NoteQueryType>;

  constructor(query: MongoDocumentQuery<NoteQueryType>) {
    this.query = query;
  }

  async id() {
    return (await this.query.queryDocument({ _id: 1 }))?._id?.toString('base64');
  }

  async urlId() {
    return (
      await this.query.queryDocument({
        note: {
          publicId: 1,
        },
      })
    )?.note?.publicId;
  }

  textFields() {
    return Object.values(NoteTextField).map((field) => {
      return {
        key: () => {
          return Promise.resolve(field);
        },
        value: () => {
          return new CollaborativeDocumentQuery({
            queryDocument: async (project) => {
              return (
                await this.query.queryDocument({
                  note: {
                    collabTexts: {
                      [field]: project,
                    },
                  },
                })
              )?.note?.collabTexts?.[field];
            },
          });
        },
      };
    });
  }

  async readOnly() {
    return (await this.query.queryDocument({ readOnly: 1 }))?.readOnly;
  }

  preferences() {
    return new NotePreferencesQuery({
      queryDocument: async (project) => {
        return (await this.query.queryDocument({ preferences: project }))?.preferences;
      },
    });
  }
}
