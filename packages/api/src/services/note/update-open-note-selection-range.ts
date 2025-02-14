// export function update

import { ObjectId } from 'mongodb';

import { MongoDBCollections, CollectionName } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';

import { upsertOpenNote } from '../../mongodb/models/note/upsert-open-note';

import { SelectionRangeSchema } from '../../mongodb/schema/collab-record';
import { DBOpenNoteSchema, OpenNoteSchema } from '../../mongodb/schema/open-note';

import {
  NoteCollabTextInvalidRevisionError,
  NoteNotFoundServiceError,
  NoteNotOpenedServiceError,
} from './errors';
import { findNoteUser } from './note';

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

  const openNote: Omit<OpenNoteSchema, 'clients'> = {
    noteId,
    userId,
    expireAt: new Date(Date.now() + (openNoteDuration ?? 1000 * 60 * 60)),
    collabText: openCollabText,
  };

  await upsertOpenNote({
    mongoDB,
    openNote,
  });

  mongoDB.loaders.note.prime(
    {
      id: {
        noteId,
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

  return {
    type: 'success' as const,
    note,
    noteUser,
    openNote,
  };
}
