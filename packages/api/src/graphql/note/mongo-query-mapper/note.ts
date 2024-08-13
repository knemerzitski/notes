import { ObjectId } from 'mongodb';

import { Changeset } from '~collab/changeset/changeset';

import { DeepQueryResult, MongoQuery } from '../../../mongodb/query/query';
import { QueryableNote } from '../../../mongodb/schema/note/query/queryable-note';
import { objectIdToStr } from '../../base/resolvers/ObjectID';
import {
  Maybe,
  NoteCategory,
  NoteTextField,
  NotetextFieldsArgs,
} from '../../types.generated';
import { NoteMapper } from '../schema.mappers';

import { findNoteUser } from '../utils/user-note';

import { NoteCollabTextQueryMapper } from './note-collab-text';
import { NotePreferencesQueryMapper } from './note-preferences';

export class NoteQueryMapper implements NoteMapper {
  private readonly targetUserId: ObjectId;
  private readonly note: MongoQuery<QueryableNote>;

  constructor(userId: ObjectId, note: MongoQuery<QueryableNote>) {
    this.targetUserId = userId;
    this.note = note;
  }

  private getTargetNoteUser(note: Maybe<DeepQueryResult<QueryableNote>>) {
    return findNoteUser(this.targetUserId, note);
  }

  async noteId() {
    return (await this.note.query({ _id: 1 }))?._id;
  }

  async noteIdStr() {
    return objectIdToStr(await this.noteId());
  }

  /**
   * Id is Note._id:NoteUser.userId
   */
  async id() {
    const noteId = await this.noteIdStr();
    if (!noteId) {
      return;
    }

    return `${noteId}:${objectIdToStr(this.targetUserId)}`;
  }

  textFields(args?: NotetextFieldsArgs) {
    const fields = args?.name ? [args.name] : Object.values(NoteTextField);
    return fields.map((field) => {
      return {
        key: () => {
          return Promise.resolve(field);
        },
        value: () => {
          return new NoteCollabTextQueryMapper(this, field, {
            query: async (query) => {
              return (
                (
                  await this.note.query({
                    collabTexts: {
                      [field]: query,
                    },
                  })
                )?.collabTexts?.[field] ?? {
                  headText: {
                    changeset: Changeset.EMPTY.serialize(),
                    revision: 0,
                  },
                  tailText: {
                    changeset: Changeset.EMPTY.serialize(),
                    revision: 0,
                  },
                  records: [],
                }
              );
            },
          });
        },
      };
    });
  }

  async readOnly() {
    return (
      this.getTargetNoteUser(
        await this.note.query({
          users: {
            $query: {
              _id: 1,
              readOnly: 1,
            },
          },
        })
      )?.readOnly ?? false
    );
  }

  preferences() {
    return new NotePreferencesQueryMapper({
      query: async (query) => {
        return this.getTargetNoteUser(
          await this.note.query({
            users: {
              $query: {
                _id: 1,
                preferences: query,
              },
            },
          })
        )?.preferences;
      },
    });
  }

  async createdAt() {
    return this.getTargetNoteUser(
      await this.note.query({
        users: {
          $query: {
            _id: 1,
            createdAt: 1,
          },
        },
      })
    )?.createdAt;
  }

  async sharing() {
    const note = await this.note.query({
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
    const note = await this.note.query({
      users: {
        $query: {
          _id: 1,
          categoryName: 1,
        },
      },
    });

    return this.getTargetNoteUser(note)?.categoryName as NoteCategory;
  }

  async deletedAt() {
    const note = await this.note.query({
      users: {
        $query: {
          _id: 1,
          trashed: {
            expireAt: 1,
          },
        },
      },
    });

    const noteUser = this.getTargetNoteUser(note);

    return noteUser?.trashed?.expireAt;
  }
}
