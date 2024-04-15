import DataLoader from 'dataloader';
import { DeepQueryResponse } from '../../../mongodb/query-builder';
import { NoteQueryType } from '../mongo-query-mapper/note';

import { GraphQLResolversContext } from '../../context';

import sortObject from '~utils/sortObject';
import { ObjectId } from 'mongodb';

import noteBatchLoad, { NoteKey } from './noteBatchLoad';
import noteConnectionBatchLoad, { NoteConnectionKey } from './noteConnectionBatchLoad';
import { CollectionName } from '../../../mongodb/collections';

export interface NotesDataSourceContext {
  mongodb: {
    collections: Pick<
      GraphQLResolversContext['mongodb']['collections'],
      | CollectionName.Users
      | CollectionName.UserNotes
      | CollectionName.CollabTexts
      | CollectionName.Notes
    >;
  };
}
export default class NotesDataSource {
  private loaders: {
    note: DataLoader<NoteKey, DeepQueryResponse<NoteQueryType>, string>;
    noteConnection: DataLoader<
      NoteConnectionKey,
      DeepQueryResponse<NoteQueryType>[],
      string
    >;
  };

  constructor(context: Readonly<NotesDataSourceContext>) {
    this.loaders = {
      note: new DataLoader<NoteKey, DeepQueryResponse<NoteQueryType>, string>(
        async (keys) => noteBatchLoad(keys, context),
        {
          cacheKeyFn: getEqualObjectString,
        }
      ),
      noteConnection: new DataLoader<
        NoteConnectionKey,
        DeepQueryResponse<NoteQueryType>[],
        string
      >((keys) => noteConnectionBatchLoad(keys, context), {
        cacheKeyFn: getEqualObjectString,
      }),
    };
  }

  getNote(key: NoteKey) {
    return this.loaders.note.load(key);
  }

  async getNoteConnection(key: NoteConnectionKey) {
    const userNotes = await this.loaders.noteConnection.load(key);

    // Add notes found in notesConnection to note loader
    userNotes.forEach((userNote) => {
      const publicId = userNote.note?.publicId;
      if (!publicId) return;

      this.loaders.note.prime(
        {
          userId: key.userId,
          publicId,
          noteQuery: key.noteQuery,
        },
        userNote
      );
    });

    return userNotes;
  }
}

function isKeyValuePrimitive(value: object) {
  const isPrimitive = value instanceof ObjectId;
  return !isPrimitive;
}

/**
 * Given two objects A and B with same contents, but A !== B => getEqualObjectString(A) === getEqualObjectString(B)
 * ObjectIds are considered primitive {@link isKeyValuePrimitive}.
 */
function getEqualObjectString(obj: unknown) {
  return JSON.stringify(sortObject(obj, isKeyValuePrimitive), null, undefined);
}
