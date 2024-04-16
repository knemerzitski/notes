import { NoteMapper } from '../schema.mappers';
import { NoteTextField } from '../../types.generated';
import { MongoDocumentQuery } from '../../../mongodb/query-builder';
import { NotePreferencesQueryMapper, NotePreferencesQuery } from './note-preferences';
import {
  CollabTextQueryMapper,
  CollabTextQuery,
} from '../../collab/mongo-query-mapper/collab-text';
import { NoteSchema } from '../../../mongodb/schema/note';
import { UserNoteSchema } from '../../../mongodb/schema/user-note';

export type NoteQuery<TCollabTextKey extends string = NoteTextField> = Omit<
  UserNoteSchema,
  'preferences' | 'note' | 'userId'
> & {
  preferences: NotePreferencesQuery;
  note: Omit<UserNoteSchema['note'], 'collabTexts' | 'collabTextIds'> & {
    collabTexts: Record<TCollabTextKey, CollabTextQuery>;
  } & Omit<NoteSchema, 'publicId' | 'collabTextIds' | '_id'>;
};

export class NoteQueryMapper implements NoteMapper {
  private query: MongoDocumentQuery<NoteQuery>;

  constructor(query: MongoDocumentQuery<NoteQuery>) {
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
          return new CollabTextQueryMapper({
            queryDocument: async (query) => {
              return (
                await this.query.queryDocument({
                  // note: {
                  //   collabTexts: {
                  //     [field]: query,
                  //   },
                  // },
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
    return new NotePreferencesQueryMapper({
      queryDocument: async (project) => {
        return (await this.query.queryDocument({ preferences: project }))?.preferences;
      },
    });
  }
}
