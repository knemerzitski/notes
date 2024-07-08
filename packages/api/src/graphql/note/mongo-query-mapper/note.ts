import { ObjectId } from 'mongodb';

import { MongoDocumentQuery } from '../../../mongodb/query-builder';
import { NoteSchema } from '../../../mongodb/schema/note';
import { ShareNoteLinkSchema } from '../../../mongodb/schema/share-note-link';
import { UserNoteSchema } from '../../../mongodb/schema/user-note';
import {
  CollabTextQueryMapper,
  CollabTextQuery,
} from '../../collab/mongo-query-mapper/collab-text';
import { NoteTextField, NotetextFieldsArgs } from '../../types.generated';
import { NoteMapper } from '../schema.mappers';

import { NotePreferencesQueryMapper, NotePreferencesQuery } from './note-preferences';

export type NoteQuery<TCollabTextKey extends string = NoteTextField> = Omit<
  UserNoteSchema,
  'preferences' | 'note' | 'userId'
> & {
  preferences: NotePreferencesQuery;
  note: Omit<UserNoteSchema['note'], 'collabTexts' | 'collabTextIds'> & {
    collabTexts: Record<TCollabTextKey, CollabTextQuery>;
  } & Omit<NoteSchema, 'publicId' | 'collabTextIds' | '_id'>;
  shareNoteLinks: Omit<ShareNoteLinkSchema, 'note' | 'sourceUserNote'>[];
};

export class NoteQueryMapper implements NoteMapper {
  private query: MongoDocumentQuery<NoteQuery>;

  constructor(query: MongoDocumentQuery<NoteQuery>) {
    this.query = query;
  }

  async id() {
    return (await this.query.queryDocument({ _id: 1 }))?._id?.toString('base64');
  }

  async contentId() {
    return (
      await this.query.queryDocument({
        note: {
          publicId: 1,
        },
      })
    )?.note?.publicId;
  }

  textFields(args?: NotetextFieldsArgs) {
    const fields = args?.name ? [args.name] : Object.values(NoteTextField);
    return fields.map((field) => {
      return {
        key: () => {
          return Promise.resolve(field);
        },
        value: () => {
          return new CollabTextQueryMapper({
            queryDocument: async (query) => {
              return (
                await this.query.queryDocument({
                  note: {
                    collabTexts: {
                      [field]: query,
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
    return new NotePreferencesQueryMapper({
      queryDocument: async (project) => {
        return (await this.query.queryDocument({ preferences: project }))?.preferences;
      },
    });
  }

  async ownerId(): Promise<ObjectId | undefined> {
    return (await this.query.queryDocument({ note: { ownerId: 1 } }))?.note?.ownerId;
  }

  async sharing() {
    const note = await this.query.queryDocument({
      shareNoteLinks: {
        $query: {
          publicId: 1,
        },
      },
    });

    const publicId = note?.shareNoteLinks?.[0]?.publicId;
    if (!publicId) return null;

    return {
      id: publicId,
    };
  }

  async categoryName() {
    const note = await this.query.queryDocument({
      category: {
        name: 1,
      },
    });

    return note?.category?.name;
  }
}
