import { ObjectId } from 'mongodb';

import { Changeset } from '~collab/changeset/changeset';

import { DeepQueryResult, MongoQuery, MongoQueryFn } from '../../../mongodb/query/query';
import { QueryableNote } from '../../../mongodb/schema/note/query/queryable-note';
import { objectIdToStr } from '../../base/resolvers/ObjectID';
import {
  Maybe,
  NoteCategory,
  NoteTextField,
  NotetextFieldsArgs,
} from '../../types.generated';
import {
  NoteMapper,
  NotePreferencesMapper,
  NoteTextFieldEntryMapper,
  NoteUserMapper,
} from '../schema.mappers';

import { findNoteUser } from '../utils/user-note';

import { GraphQLResolversContext } from '../../context';
import { GraphQLResolveInfo } from 'graphql';
import { withPreFetchedArraySize } from '../../utils/with-pre-fetched-array-size';
import { QueryableCollabTextSchema } from '../../../mongodb/schema/collab-text/query/collab-text';
import { CollabTextMapper } from '../../collab/schema.mappers';

const DEFAULT_COLLAB_TEXT: QueryableCollabTextSchema = {
  headText: {
    changeset: Changeset.EMPTY.serialize(),
    revision: 0,
  },
  tailText: {
    changeset: Changeset.EMPTY.serialize(),
    revision: 0,
  },
  records: [],
};

export function createNoteCollabTextMapper(
  fieldName: string,
  noteQuery: MongoQueryFn<QueryableNote>
): CollabTextMapper {
  return {
    id: async () => {
      const note = await noteQuery({
        _id: 1,
      });
      const noteIdStr = objectIdToStr(note?._id);

      if (!noteIdStr) return null;

      return `${noteIdStr}:${fieldName}`;
    },
    query: async (query) =>
      (
        await noteQuery({
          collabTexts: {
            [fieldName]: query,
          },
        })
      )?.collabTexts?.[fieldName] ?? DEFAULT_COLLAB_TEXT,
  };
}

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

  textFields(args?: NotetextFieldsArgs): NoteTextFieldEntryMapper[] {
    const fields = args?.name ? [args.name] : Object.values(NoteTextField);
    return fields.map((fieldName) => {
      return {
        key: fieldName,
        value: createNoteCollabTextMapper(fieldName, (q) => this.note.query(q)),
      };
    });
  }

  async readOnly() {
    return (
      this.getTargetNoteUser(
        await this.note.query({
          users: {
            _id: 1,
            readOnly: 1,
          },
        })
      )?.readOnly ?? false
    );
  }

  preferences(): NotePreferencesMapper {
    return {
      query: async (query) => {
        return this.getTargetNoteUser(
          await this.note.query({
            users: {
              _id: 1,
              preferences: query,
            },
          })
        )?.preferences;
      },
    };
  }

  async createdAt() {
    return this.getTargetNoteUser(
      await this.note.query({
        users: {
          _id: 1,
          createdAt: 1,
        },
      })
    )?.createdAt;
  }

  async sharing() {
    const note = await this.note.query({
      shareNoteLinks: {
        publicId: 1,
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
        _id: 1,
        categoryName: 1,
      },
    });

    return this.getTargetNoteUser(note)?.categoryName as NoteCategory;
  }

  async deletedAt() {
    const note = await this.note.query({
      users: {
        _id: 1,
        trashed: {
          expireAt: 1,
        },
      },
    });

    const noteUser = this.getTargetNoteUser(note);

    return noteUser?.trashed?.expireAt;
  }

  async users(
    ctx: GraphQLResolversContext,
    info: GraphQLResolveInfo
  ): Promise<NoteUserMapper[]> {
    return withPreFetchedArraySize(
      (index, updateSize) => {
        const queryAllUsers: NoteUserMapper['queryAllUsers'] = async (query) => {
          const users = (
            await this.note.query({
              users: query,
            })
          )?.users;

          updateSize(users?.length);

          return users;
        };

        return {
          currentUserId: this.targetUserId,
          queryAllUsers,
          queryUser: async (query) => {
            return (await queryAllUsers(query))?.[index];
          },
        };
      },
      ctx,
      info
    );
  }
}
