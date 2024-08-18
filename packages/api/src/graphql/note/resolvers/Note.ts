import { Changeset } from '~collab/changeset/changeset';
import {
  NoteCategory,
  NoteTextField,
  type NoteResolvers,
} from '../../../graphql/types.generated';
import { MongoQueryFn } from '../../../mongodb/query/query';
import { QueryableCollabTextSchema } from '../../../mongodb/schema/collab-text/query/collab-text';
import { QueryableNote } from '../../../mongodb/schema/note/query/queryable-note';
import { objectIdToStr } from '../../base/resolvers/ObjectID';
import { CollabTextMapper } from '../../collab/schema.mappers';
import { findNoteUser } from '../utils/user-note';
import { withPreFetchedArraySize } from '../../utils/with-pre-fetched-array-size';
import { NoteMapper, NoteUserMapper } from '../schema.mappers';

export async function Note_id(parent: NoteMapper) {
  const noteId = await Note_noteId_str(parent.query);
  if (!noteId) {
    return;
  }

  return `${noteId}:${objectIdToStr(parent.userId)}`;
}

export async function Note_noteId(query: NoteMapper['query']) {
  return (await query({ _id: 1 }))?._id;
}

export async function Note_noteId_str(query: NoteMapper['query']) {
  return objectIdToStr(await Note_noteId(query));
}

export function Note_textFields_value(
  fieldName: string,
  noteQuery: MongoQueryFn<QueryableNote>
): CollabTextMapper {
  return {
    id: async () => {
      const noteId = await Note_noteId_str(noteQuery);
      if (!noteId) return null;

      return `${noteId}:${fieldName}`;
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

export const Note: Pick<
  NoteResolvers,
  | 'categoryName'
  | 'createdAt'
  | 'deletedAt'
  | 'id'
  | 'noteId'
  | 'preferences'
  | 'readOnly'
  | 'textFields'
  | 'users'
> = {
  id: (parent) => {
    return Note_id(parent);
  },
  noteId: (parent) => {
    return Note_noteId(parent.query);
  },
  preferences: (parent) => {
    return {
      query: async (query) => {
        return findNoteUser(
          parent.userId,
          await parent.query({
            users: {
              _id: 1,
              preferences: query,
            },
          })
        )?.preferences;
      },
    };
  },
  readOnly: async (parent) => {
    return (
      findNoteUser(
        parent.userId,
        await parent.query({
          users: {
            _id: 1,
            readOnly: 1,
          },
        })
      )?.readOnly ?? false
    );
  },
  textFields: (parent, args) => {
    const fields = args.name ? [args.name] : Object.values(NoteTextField);
    return fields.map((fieldName) => {
      return {
        key: fieldName,
        value: Note_textFields_value(fieldName, (q) => parent.query(q)),
      };
    });
  },
  createdAt: async (parent) => {
    return findNoteUser(
      parent.userId,
      await parent.query({
        users: {
          _id: 1,
          createdAt: 1,
        },
      })
    )?.createdAt;
  },
  categoryName: async (parent) => {
    return findNoteUser(
      parent.userId,
      await parent.query({
        users: {
          _id: 1,
          categoryName: 1,
        },
      })
    )?.categoryName as NoteCategory;
  },
  deletedAt: async (parent) => {
    return findNoteUser(
      parent.userId,
      await parent.query({
        users: {
          _id: 1,
          trashed: {
            expireAt: 1,
          },
        },
      })
    )?.trashed?.expireAt;
  },
  users: (parent, _args, ctx, info) => {
    return withPreFetchedArraySize(
      (index, updateSize) => {
        const queryAllUsers: NoteUserMapper['queryAllUsers'] = async (query) => {
          const users = (
            await parent.query({
              users: query,
            })
          )?.users;

          updateSize(users?.length);

          return users;
        };

        return {
          currentUserId: parent.userId,
          queryAllUsers,
          queryUser: async (query) => {
            return (await queryAllUsers(query))?.[index];
          },
        };
      },
      ctx,
      info
    );
  },
};
