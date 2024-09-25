// export function update

import { ObjectId } from 'mongodb';
import { MongoDBCollections, CollectionName } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { findNoteUser } from './note';
import {
  NoteCollabTextInvalidRevisionError,
  NoteNotFoundServiceError,
  NoteNotOpenedServiceError,
} from './errors';
import { SelectionRangeSchema } from '../../mongodb/schema/collab-text';
import { DBOpenNoteSchema, OpenNoteSchema } from '../../mongodb/schema/open-note';
import { upsertOpenNote } from '../../mongodb/models/note/upsert-open-note';

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
          connectionIds: 1,
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

  if (!noteUser.openNote?.connectionIds.includes(connectionId)) {
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

  const openNote: OpenNoteSchema = {
    noteId,
    userId,
    expireAt: new Date(Date.now() + (openNoteDuration ?? 1000 * 60 * 60)),
    collabText: openCollabText,
    connectionIds: [connectionId],
  };

  await upsertOpenNote({
    mongoDB,
    openNote,
  });

  return {
    type: 'success' as const,
    note,
    noteUser,
    openNote,
  };
}
