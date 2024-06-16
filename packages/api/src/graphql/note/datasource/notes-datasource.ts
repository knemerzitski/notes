import DataLoader from 'dataloader';
import { AggregateOptions, ObjectId } from 'mongodb';
import callFnGrouped from '~utils/callFnGrouped';
import sortObject from '~utils/object/sortObject';

import { CollectionName } from '../../../mongodb/collections';
import { DeepQueryResponse } from '../../../mongodb/query-builder';
import { GraphQLResolversContext } from '../../context';
import { NoteQuery } from '../mongo-query-mapper/note';



import noteBatchLoad, { NoteKey } from './noteBatchLoad';
import noteConnectionBatchLoad, {
  NoteConnectionBatchLoadOutput,
  NoteConnectionKey,
} from './noteConnectionBatchLoad';



export interface NotesDataSourceContext {
  mongodb: {
    collections: Pick<
      GraphQLResolversContext['mongodb']['collections'],
      | CollectionName.Users
      | CollectionName.UserNotes
      | CollectionName.CollabTexts
      | CollectionName.Notes
      | CollectionName.ShareNoteLinks
    >;
  };
}

type NoteKeyWithSession = {
  noteKey: NoteKey;
} & Pick<AggregateOptions, 'session'>;

export default class NotesDataSource {
  private context: Readonly<NotesDataSourceContext>;

  private loaders: {
    note: DataLoader<NoteKeyWithSession, DeepQueryResponse<NoteQuery>, string>;
    noteConnection: DataLoader<NoteConnectionKey, NoteConnectionBatchLoadOutput, string>;
  };

  constructor(context: Readonly<NotesDataSourceContext>) {
    this.context = context;

    this.loaders = {
      note: new DataLoader<NoteKeyWithSession, DeepQueryResponse<NoteQuery>, string>(
        async (keys) =>
          callFnGrouped(
            keys,
            (key) => key.session,
            (keys, session) =>
              noteBatchLoad(
                keys.map(({ noteKey }) => noteKey),
                this.context,
                {
                  session,
                }
              )
          ),
        {
          cacheKeyFn: (key) => {
            return getEqualObjectString(key.noteKey);
          },
        }
      ),
      noteConnection: new DataLoader<
        NoteConnectionKey,
        NoteConnectionBatchLoadOutput,
        string
      >((keys) => noteConnectionBatchLoad(keys, context), {
        cacheKeyFn: getEqualObjectString,
      }),
    };
  }

  // TODO rename to loadNote
  getNote(key: NoteKey, aggregateOptions?: Pick<AggregateOptions, 'session'>) {
    const loaderKey: NoteKeyWithSession = {
      noteKey: key,
    };
    if (aggregateOptions?.session) {
      loaderKey.session = aggregateOptions.session;
      // Clear key since session implies a transaction where returned value must be always up-to-date
      return this.loaders.note.clear(loaderKey).load(loaderKey);
    } else {
      return this.loaders.note.load(loaderKey);
    }
  }

  // TODO rename to loadNoteConnection
  async getNoteConnection<
    TCustomQuery extends Record<string, unknown> = Record<string, never>,
  >(key: NoteConnectionKey) {
    const result = await this.loaders.noteConnection.load(key);

    // Add notes found in notesConnection to note loader
    result.userNotes.forEach((userNote) => {
      const publicId = userNote.note?.publicId;
      if (!publicId) return;

      this.loaders.note.prime(
        {
          noteKey: {
            userId: key.userId,
            publicId,
            noteQuery: key.noteQuery,
          },
        },
        userNote
      );
    });

    return result as NoteConnectionBatchLoadOutput<TCustomQuery>;
  }
}

function sortIsNotObjectId(value: object) {
  return !(value instanceof ObjectId);
}

function excludeIsUndefined({ value }: { value: unknown }) {
  return value === undefined;
}

/**
 * Given two objects A and B with same contents, but A !== B => getEqualObjectString(A) === getEqualObjectString(B)
 */
function getEqualObjectString(obj: unknown) {
  return JSON.stringify(
    sortObject(obj, {
      sort: sortIsNotObjectId,
      exclude: excludeIsUndefined,
    }),
    null,
    undefined
  );
}
