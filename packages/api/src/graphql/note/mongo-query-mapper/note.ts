import { ObjectId } from 'mongodb';

import { DeepQueryResult, MongoQuery } from '../../../mongodb/query/query';
import { QueryableNote } from '../../../mongodb/schema/note/query/queryable-note';
import {
  Maybe,
  NoteCategory,
  NoteTextField,
  NotetextFieldsArgs,
} from '../../types.generated';
import { NoteMapper } from '../schema.mappers';

import { NoteCollabTextQueryMapper } from './note-collab-text';
import { NotePreferencesQueryMapper } from './note-preferences';

export class NoteQueryMapper implements NoteMapper {
  private readonly targetUserId: ObjectId;
  private readonly note: MongoQuery<QueryableNote>;

  constructor(userId: ObjectId, note: MongoQuery<QueryableNote>) {
    this.targetUserId = userId;
    this.note = note;
  }

  private getTargetUserNote(note: Maybe<DeepQueryResult<QueryableNote>>) {
    return note?.userNotes?.find(({ userId }) => userId?.equals(this.targetUserId));
  }

  async id() {
    return (await this.note.query({ _id: 1 }))?._id?.toString('base64');
  }

  async contentId() {
    return (
      await this.note.query({
        publicId: 1,
      })
    )?.publicId;
  }

  textFields(args?: NotetextFieldsArgs) {
    const fields = args?.name ? [args.name] : Object.values(NoteTextField);
    return fields.map((field) => {
      return {
        key: () => {
          return Promise.resolve(field);
        },
        value: () => {
          return new NoteCollabTextQueryMapper(this.note, field, {
            query: async (query) => {
              return (
                await this.note.query({
                  collabTexts: {
                    [field]: query,
                  },
                })
              )?.collabTexts?.[field];
            },
          });
        },
      };
    });
  }

  async readOnly() {
    return (
      this.getTargetUserNote(
        await this.note.query({
          userNotes: {
            $query: {
              userId: 1,
              readOnly: 1,
            },
          },
        })
      )?.readOnly ?? false
    );
  }

  preferences() {
    return new NotePreferencesQueryMapper({
      query: async (project) => {
        return this.getTargetUserNote(
          await this.note.query({
            userNotes: {
              $query: {
                userId: 1,
                preferences: project,
              },
            },
          })
        )?.preferences;
      },
    });
  }

  async isOwner() {
    return (
      this.getTargetUserNote(
        await this.note.query({
          userNotes: {
            $query: {
              userId: 1,
              isOwner: 1,
            },
          },
        })
      )?.isOwner ?? false
    );
  }

  async sharing() {
    const userNote = await this.note.query({
      shareNoteLinks: {
        $query: {
          publicId: 1,
        },
      },
    });

    const publicId = userNote?.shareNoteLinks?.[0]?.publicId;
    if (!publicId) return null;

    return {
      id: publicId,
    };
  }

  async categoryName() {
    const note = await this.note.query({
      userNotes: {
        $query: {
          userId: 1,
          categoryName: 1,
        },
      },
    });

    return this.getTargetUserNote(note)?.categoryName as NoteCategory;
  }
}
