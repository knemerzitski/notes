// export function update

import { ObjectId } from 'mongodb';

import { CollectionName } from '../../mongodb/collection-names';
import { MongoDBCollections } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';

import { updateOpenNote } from '../../mongodb/models/note/update-open-note';

import { SelectionRangeSchema } from '../../mongodb/schema/collab-record';
import { DBOpenNoteSchema, OpenNoteSchema } from '../../mongodb/schema/open-note';

import {
  NoteCollabTextInvalidRevisionError,
  NoteNotFoundServiceError,
  NoteNotOpenedServiceError,
} from './errors';
import { findNoteUser } from './note';
import { PickDeep } from '../../../../utils/src/types';
import { QueryableNote } from '../../mongodb/loaders/note/descriptions/note';
import { MongoReadonlyDeep } from '../../mongodb/types';

export async function updateOpenNoteSelectionRange({
  mongoDB,
  userId,
  noteId,
  connectionId,
  revision,
  selection,
  openNoteDuration,
}: {
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.OPEN_NOTES>;
    loaders: Pick<MongoDBLoaders, 'note'>;
  };
  userId: ObjectId;
  noteId: ObjectId;
  connectionId: string | undefined;
  /**
   * Selection revision for CollabText
   */
  revision: number;
  selection: SelectionRangeSchema;
  openNoteDuration?: number;
}) {
  if (!connectionId) {
    throw new NoteNotOpenedServiceError(userId, noteId, connectionId);
  }

  const note = await mongoDB.loaders.note.load({
    id: {
      userId,
      noteId,
    },
    query: {
      _id: 1,
      users: {
        _id: 1,
        openNote: {
          clients: {
            connectionId: 1,
          },
        },
      },
      collabText: {
        headText: {
          revision: 1,
        },
        tailText: {
          revision: 1,
        },
      },
    },
  });

  const noteUser = findNoteUser(userId, note);
  if (!noteUser) {
    throw new NoteNotFoundServiceError(noteId);
  }

  if (
    !noteUser.openNote?.clients.some((client) => client.connectionId === connectionId)
  ) {
    throw new NoteNotOpenedServiceError(userId, noteId, connectionId);
  }

  if (note.collabText) {
    if (note.collabText.headText.revision < revision) {
      throw new NoteCollabTextInvalidRevisionError(
        revision,
        null,
        note.collabText.headText.revision
      );
    } else if (revision < note.collabText.tailText.revision) {
      throw new NoteCollabTextInvalidRevisionError(
        revision,
        note.collabText.tailText.revision,
        null
      );
    }
  } else if (revision !== 0) {
    throw new NoteCollabTextInvalidRevisionError(revision, 0, 0);
  }

  const openCollabText: DBOpenNoteSchema['collabText'] = {
    revision,
    latestSelection: selection,
  };

  const openNote = await updateOpenNoteAndPrime({
    connectionId,
    mongoDB,
    note: {
      _id: note._id,
      users: note.users,
    },
    openCollabText,
    userId,
    openNoteDuration,
    upsertOpenNote: true,
  });

  return {
    type: 'success' as const,
    note,
    noteUser,
    openNote,
  };
}

export async function updateOpenNoteAndPrime({
  openCollabText,
  connectionId,
  userId,
  note,
  openNoteDuration,
  mongoDB,
  upsertOpenNote,
}: {
  openCollabText: DBOpenNoteSchema['collabText'];
  connectionId: string;
  userId: ObjectId;
  note: MongoReadonlyDeep<
    PickDeep<
      QueryableNote,
      {
        _id: 1;
        users: {
          _id: 1;
          openNote: {
            clients: {
              connectionId: 1;
            };
          };
        };
      }
    >
  >;
  openNoteDuration?: number;
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.OPEN_NOTES>;
    loaders: Pick<MongoDBLoaders, 'note'>;
  };
  /**
   * @default false
   */
  upsertOpenNote: boolean;
}) {
  const noteUser = findNoteUser(userId, note);
  if (!noteUser) {
    return false;
  }

  const hasCurrentConnectionOpenedNote = noteUser.openNote?.clients.some(
    (client) => client.connectionId === connectionId
  );
  if (!hasCurrentConnectionOpenedNote) {
    return false;
  }

  const openNote: Omit<OpenNoteSchema, 'clients'> = {
    noteId: note._id,
    userId,
    expireAt: new Date(Date.now() + (openNoteDuration ?? 1000 * 60 * 60)),
    collabText: openCollabText,
  };

  // Update DB
  await updateOpenNote(
    {
      mongoDB,
      openNote,
    },
    {
      // Only update if openNote exists
      upsert: upsertOpenNote,
    }
  );

  // Update cache
  mongoDB.loaders.note.prime(
    {
      id: {
        noteId: note._id,
        userId,
      },
      query: {
        _id: 1,
        users: {
          openNote: {
            collabText: {
              revision: 1,
              latestSelection: {
                start: 1,
                end: 1,
              },
            },
            expireAt: 1,
          },
        },
      },
    },
    {
      _id: note._id,
      users: note.users.map((_noteUser) =>
        _noteUser._id.equals(noteUser._id)
          ? {
              ..._noteUser,
              openNote,
            }
          : _noteUser
      ),
    }
  );

  return openNote;
}
