import DataLoader from 'dataloader';
import { DeepQueryResponse } from '../../../mongodb/query-builder';
import { NoteQuery } from '../mongo-query-mapper/note';

import { GraphQLResolversContext } from '../../context';

import sortObject from '~utils/sortObject';
import { AggregateOptions, ClientSession, ObjectId } from 'mongodb';

import noteBatchLoad, { NoteKey } from './noteBatchLoad';
import noteConnectionBatchLoad, {
  NoteConnectionBatchLoadOutput,
  NoteConnectionKey,
} from './noteConnectionBatchLoad';
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
  private context: Readonly<NotesDataSourceContext>;

  private loaders: {
    note: DataLoader<NoteKey, DeepQueryResponse<NoteQuery>, string>;
    noteConnection: DataLoader<NoteConnectionKey, NoteConnectionBatchLoadOutput, string>;
  };

  private loadersWithSession: {
    note: WeakMap<
      ClientSession,
      DataLoader<NoteKey, DeepQueryResponse<NoteQuery>, string>
    >;
  };

  constructor(context: Readonly<NotesDataSourceContext>) {
    this.context = context;

    this.loaders = {
      note: new DataLoader<NoteKey, DeepQueryResponse<NoteQuery>, string>(
        async (keys) => noteBatchLoad(keys, context),
        {
          cacheKeyFn: getEqualObjectString,
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

    this.loadersWithSession = {
      note: new WeakMap(),
    };
  }

  getNote(key: NoteKey, aggregateOptions?: Pick<AggregateOptions, 'session'>) {
    if (aggregateOptions?.session) {
      const session = aggregateOptions.session;

      let loaderWithSession = this.loadersWithSession.note.get(session);
      if (!loaderWithSession) {
        loaderWithSession = new DataLoader<NoteKey, DeepQueryResponse<NoteQuery>, string>(
          async (keys) =>
            noteBatchLoad(keys, this.context, {
              session,
            }),
          {
            cacheKeyFn: getEqualObjectString,
          }
        );
        this.loadersWithSession.note.set(session, loaderWithSession);
      }

      return loaderWithSession.load(key);
    } else {
      return this.loaders.note.load(key);
    }
  }

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
          userId: key.userId,
          publicId,
          noteQuery: key.noteQuery,
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
