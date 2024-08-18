import { __InputValue } from 'graphql';

import { ObjectId, UpdateFilter } from 'mongodb';

import { QueryResultDeep } from '../../../../mongodb/query/query';
import { QueryableNote } from '../../../../mongodb/schema/note/query/queryable-note';
import { getNotesArrayPath } from '../../../../mongodb/schema/user/user';
import { assertAuthenticated } from '../../../base/directives/auth';
import { throwNoteNotFound } from '../../utils/note-errors';
import { findNoteUser } from '../../utils/user-note';
import { publishNoteUpdated } from '../Subscription/noteEvents';

import {
  ListAnchorPosition,
  MovableNoteCategory,
  MoveNoteInput,
  NoteCategory,
  type MutationResolvers,
} from './../../../types.generated';
import { NoteMapper } from '../../schema.mappers';
import { Note_id } from '../Note';

export const moveNote: NonNullable<MutationResolvers['moveNote']> = async (
  _parent,
  { input },
  ctx
) => {
  const { noteId, location } = input;
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const { note, actualLocation, modified } = await mongodb.client.withSession((session) =>
    session.withTransaction(async (session) => {
      const notePromise = mongodb.loaders.note.load({
        id: {
          userId: currentUserId,
          noteId,
        },
        query: {
          _id: 1,
          users: {
            _id: 1,
            categoryName: 1,
            trashed: {
              expireAt: 1,
              originalCategoryName: 1,
            },
          },
        },
        // Fetching note category doesn't require as session
      });

      let processedNote: ReturnType<typeof processNote> | undefined;
      let anchorCategoryName: string = NoteCategory.DEFAULT;
      if (!location) {
        // Must wait to fetch correct category
        const note = await notePromise;
        processedNote = processNote({ note, currentUserId, input });
        anchorCategoryName = processedNote.desiredCategoryName;
      } else {
        anchorCategoryName = location.categoryName;
      }

      const anchorInfoPromise = mongodb.collections.users
        .aggregate<AnchorLocationInfo>(
          [
            {
              $match: {
                _id: currentUserId,
              },
            },
            {
              $project: {
                _id: 0,
                anchorIndex: location?.anchorNoteId
                  ? {
                      $indexOfArray: [
                        `$${getNotesArrayPath(anchorCategoryName)}`,
                        location.anchorNoteId,
                      ],
                    }
                  : null,
                lastId: {
                  $last: `$${getNotesArrayPath(anchorCategoryName)}`,
                },
              },
            },
          ],
          {
            session,
          }
        )
        .toArray()
        .then((users) => users[0]);

      const [note, anchorInfo] = await Promise.all([notePromise, anchorInfoPromise]);

      const { isNoteTrashed, existingCategoryName, desiredCategoryName } =
        processedNote ?? processNote({ note, currentUserId, input });

      // Return early since already in correct category and anchor wasn't specified
      if (
        existingCategoryName === desiredCategoryName &&
        location?.anchorNoteId == null
      ) {
        return {
          note,
          actualLocation: {
            categoryName: desiredCategoryName,
            anchorId: null,
            anchorPosition: null,
          },
          modified: false,
        };
      }

      const currenNoteUserFilterName = 'currentNoteUser';

      const updatePromises: Promise<unknown>[] = [];

      const isChangingCategory = existingCategoryName !== desiredCategoryName;

      if (isChangingCategory) {
        // Move note in user document from one category to other
        updatePromises.push(
          mongodb.collections.users.updateOne(
            {
              _id: currentUserId,
            },
            {
              $pull: {
                [getNotesArrayPath(existingCategoryName)]: noteId,
              },
              $push: {
                [getNotesArrayPath(desiredCategoryName)]:
                  anchorInfo?.anchorIndex != null && anchorInfo.anchorIndex !== -1
                    ? {
                        $each: [noteId],
                        $position:
                          anchorInfo.anchorIndex +
                          (location?.anchorPosition === ListAnchorPosition.AFTER ? 1 : 0),
                      }
                    : noteId,
              },
            },
            {
              session,
            }
          )
        );
      } else {
        // Category is same, must use bulkWrite to change index
        updatePromises.push(
          mongodb.collections.users.bulkWrite(
            [
              {
                updateOne: {
                  filter: {
                    _id: currentUserId,
                  },
                  update: {
                    $pull: {
                      [getNotesArrayPath(existingCategoryName)]: noteId,
                    },
                  },
                },
              },
              {
                updateOne: {
                  filter: {
                    _id: currentUserId,
                  },
                  update: {
                    $push: {
                      [getNotesArrayPath(existingCategoryName)]:
                        anchorInfo?.anchorIndex != null && anchorInfo.anchorIndex !== -1
                          ? {
                              $each: [noteId],
                              $position:
                                anchorInfo.anchorIndex +
                                (location?.anchorPosition === ListAnchorPosition.AFTER
                                  ? 1
                                  : 0),
                            }
                          : noteId,
                    },
                  },
                },
              },
            ],
            {
              session,
            }
          )
        );
      }

      let noteUpdateFilter: UpdateFilter<Document> | undefined;

      // Change categoryName in note document
      if (existingCategoryName !== desiredCategoryName) {
        noteUpdateFilter = {
          ...noteUpdateFilter,
          $set: {
            ...noteUpdateFilter?.$set,
            [`users.$[${currenNoteUserFilterName}].categoryName`]: desiredCategoryName,
          },
        };
      }

      // Delete trashed since note is moved out of trash
      if (isNoteTrashed) {
        noteUpdateFilter = {
          ...noteUpdateFilter,
          $unset: {
            ...noteUpdateFilter?.$unset,
            [`users.$[${currenNoteUserFilterName}].trashed`]: 1,
          },
        };
      }

      if (noteUpdateFilter) {
        updatePromises.push(
          mongodb.collections.notes.updateOne(
            {
              _id: noteId,
            },
            noteUpdateFilter,
            {
              session,
              arrayFilters: [
                {
                  [`${currenNoteUserFilterName}._id`]: currentUserId,
                },
              ],
            }
          )
        );
      }

      await Promise.all(updatePromises);

      if (
        anchorInfo?.anchorIndex != null &&
        anchorInfo.anchorIndex !== -1 &&
        location?.anchorNoteId != null
      ) {
        // Use anchor
        return {
          note,
          actualLocation: {
            categoryName: desiredCategoryName,
            anchorId: location.anchorNoteId,
            anchorPosition: location.anchorPosition ?? ListAnchorPosition.BEFORE,
          },
          modified: true,
        };
      } else if (anchorInfo?.lastId != null && !anchorInfo.lastId.equals(noteId)) {
        // Use last note as anchor
        return {
          note,
          actualLocation: {
            categoryName: desiredCategoryName,
            anchorId: anchorInfo.lastId,
            anchorPosition: ListAnchorPosition.AFTER,
          },
          modified: true,
        };
      }

      // Anchor unknown
      return {
        note,
        actualLocation: {
          categoryName: desiredCategoryName,
          anchorId: null,
          anchorPosition: null,
        },
        modified: true,
      };
    })
  );

  function createNoteMapperForUser(userId: ObjectId): NoteMapper {
    return {
      userId,
      query: (query) =>
        mongodb.loaders.note.load({
          id: {
            userId,
            noteId,
          },
          query,
        }),
    };
  }

  const currentUserNoteMapper = createNoteMapperForUser(currentUserId);

  const anchorNoteMapper: NoteMapper | null = actualLocation.anchorId
    ? {
        userId: currentUserId,
        query: (query) =>
          mongodb.loaders.note.load({
            id: {
              userId: currentUserId,
              noteId: actualLocation.anchorId,
            },
            query,
          }),
      }
    : null;

  if (modified) {
    const noteUser = findNoteUser(currentUserId, note);
    const noteIsTrashed = noteUser?.trashed != null;

    mongodb.loaders.note.prime(
      {
        id: {
          userId: currentUserId,
          noteId,
        },
        query: {
          users: {
            _id: 1,
            categoryName: 1,
            trashed: {
              expireAt: 1,
              originalCategoryName: 1,
            },
          },
        },
      },
      {
        users: note?.users?.map((noteUser) => {
          if (!currentUserId.equals(noteUser._id)) {
            return noteUser;
          }

          // Exclude trashed
          const { trashed, ...restNoteUser } = noteUser;

          return {
            ...restNoteUser,
            categoryName: actualLocation.categoryName,
          };
        }),
      },
      { clearCache: true }
    );

    if (actualLocation.anchorId) {
      mongodb.loaders.note.prime(
        {
          id: {
            userId: currentUserId,
            noteId: actualLocation.anchorId,
          },
          query: {
            _id: 1,
          },
        },
        {
          _id: actualLocation.anchorId,
        },
        { clearCache: true }
      );
    }

    // Subscription
    await publishNoteUpdated(
      currentUserId,
      {
        note: {
          id: () => Note_id(currentUserNoteMapper),
          location: {
            categoryName: actualLocation.categoryName as MovableNoteCategory,
            anchorPosition: actualLocation.anchorPosition,
            anchorNote: anchorNoteMapper,
          },
          categoryName: actualLocation.categoryName as NoteCategory,
          deletedAt: noteIsTrashed ? null : undefined,
        },
      },
      ctx
    );
  }

  // Response
  return {
    location: {
      categoryName: actualLocation.categoryName as MovableNoteCategory,
      anchorPosition: actualLocation.anchorPosition,
      anchorNote: anchorNoteMapper,
    },
    note: currentUserNoteMapper,
  };
};

interface AnchorLocationInfo {
  // Anchor is at specified index. Value is -1 or null if index is unknown
  anchorIndex: number | null;
  // Last note id in list. Null if list is empty.
  lastId: ObjectId | null;
}

interface ProcessNoteParams {
  note: QueryResultDeep<QueryableNote> | undefined;
  currentUserId: ObjectId;
  input: MoveNoteInput;
}

function processNote({
  note,
  currentUserId,
  input: { location, noteId },
}: ProcessNoteParams) {
  const noteUser = findNoteUser(currentUserId, note);
  if (!note?._id || !noteUser) {
    throwNoteNotFound(noteId);
  }

  const isNoteTrashed = noteUser.trashed != null;

  const existingCategoryName = noteUser.categoryName ?? NoteCategory.DEFAULT;
  const desiredCategoryName =
    location?.categoryName ??
    (isNoteTrashed ? noteUser.trashed.originalCategoryName : null) ??
    NoteCategory.DEFAULT;

  return {
    noteUser,
    isNoteTrashed,
    existingCategoryName,
    desiredCategoryName,
  };
}
