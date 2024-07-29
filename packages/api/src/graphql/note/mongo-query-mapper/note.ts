import { ObjectId } from 'mongodb';

import { MongoQuery } from '../../../mongodb/query/query';
import { QueryableUserNote } from '../../../mongodb/schema/user-note/query/queryable-user-note';
import { NoteCategory, NoteTextField, NotetextFieldsArgs } from '../../types.generated';
import { NoteMapper } from '../schema.mappers';

import { NoteCollabTextQueryMapper } from './note-collab-text';
import { NotePreferencesQueryMapper } from './note-preferences';

export class NoteQueryMapper implements NoteMapper {
  private userNote: MongoQuery<QueryableUserNote>;

  constructor(userNote: MongoQuery<QueryableUserNote>) {
    this.userNote = userNote;
  }

  async id() {
    return (await this.userNote.query({ _id: 1 }))?._id?.toString('base64');
  }

  async contentId() {
    return (
      await this.userNote.query({
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
          return new NoteCollabTextQueryMapper(this.userNote, field, {
            query: async (query) => {
              return (
                await this.userNote.query({
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
    return (await this.userNote.query({ readOnly: 1 }))?.readOnly;
  }

  preferences() {
    return new NotePreferencesQueryMapper({
      query: async (project) => {
        return (await this.userNote.query({ preferences: project }))?.preferences;
      },
    });
  }

  async ownerId(): Promise<ObjectId | undefined> {
    return (await this.userNote.query({ note: { ownerId: 1 } }))?.note?.ownerId;
  }

  async sharing() {
    const note = await this.userNote.query({
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
    const note = await this.userNote.query({
      category: {
        name: 1,
      },
    });

    return note?.category?.name as NoteCategory;
  }
}
