import { ApolloCache, makeVar } from '@apollo/client';

import { Logger } from '../../../../utils/src/logging';

import {
  JsonTyperService,
  spaceNewlineHook,
  TextParser,
  CollabService,
  CollabServiceSerializer,
  CollabTyper,
} from '../../../../collab2/src';

import { CacheRecordsFacade } from './cache-records-facade';

export function createNoteExternalStateContext<TKey extends string>(
  { keys }: { keys: TKey[] },
  options?: {
    defaultKey?: TKey;
    logger?: Logger;
  }
) {
  const logger = options?.logger;
  const fieldNames = keys;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const fallbackKey = options?.defaultKey ?? fieldNames[0]!;

  const collabServiceSerializer = new CollabServiceSerializer();

  const collabServiceContext: NonNullable<
    ConstructorParameters<typeof CollabService>[0]
  >['context'] = {
    historySizeLimit: 200,
    logger: logger?.extend('service'),
    serializer: collabServiceSerializer,
  };

  const jsonTyperContext: ConstructorParameters<
    typeof JsonTyperService<TKey>
  >[0]['context'] = {
    logger: logger?.extend('json'),
    parser: new TextParser({
      logger: logger?.extend('parser'),
      hook: spaceNewlineHook,
      keys: fieldNames,
      fallbackKey,
    }),
  };

  function newValue(
    state: CollabServiceOptions['state'],
    options: {
      cache?: ApolloCache<unknown>;
      userId: string;
      collabTextDataId?: string;
    }
  ): NoteExternalState<TKey> {
    const userId = options.userId;

    return new NoteExternalState<TKey>({
      collabService: {
        state,
        isExternalTypingHistory: (record) => record.authorId === userId,
        context: collabServiceContext,
        serverFacades:
          options.collabTextDataId && options.cache
            ? new Set([new CacheRecordsFacade(options.cache, options.collabTextDataId)])
            : undefined,
      },
      jsonTyper: {
        fieldNames,
        context: jsonTyperContext,
      },
    });
  }

  function parseValue(value: unknown, options: Parameters<typeof newValue>[1]) {
    return newValue(collabServiceSerializer.deserialize(value), options);
  }

  function isInstance(value: unknown): value is NoteExternalState<TKey> {
    if (!(value instanceof NoteExternalState)) {
      return false;
    }
    const valueKeys = Object.keys(value.fields);

    if (valueKeys.length !== keys.length) {
      return false;
    }

    return valueKeys.every((key) => keys.includes(key as TKey));
  }

  return {
    fieldNames: keys as Readonly<typeof keys>,
    newValue,
    parseValue,
    isInstance,
  } as const;
}

type CollabServiceOptions = NonNullable<ConstructorParameters<typeof CollabService>[0]>;
type JsonTyperOptions<TKey extends string> = Omit<
  ConstructorParameters<typeof JsonTyperService<TKey>>[0],
  'collabService'
>;

export type NoteTextFieldEditor = CollabTyper;

export class NoteExternalState<TKey extends string> {
  readonly service;

  readonly fields: Record<TKey, NoteFieldExternalState>;

  private readonly jsonTyper;

  constructor(options: {
    collabService: CollabServiceOptions;
    jsonTyper: JsonTyperOptions<TKey>;
  }) {
    this.service = new CollabService(options.collabService);

    this.jsonTyper = new JsonTyperService({
      ...options.jsonTyper,
      collabService: this.service,
    });

    const fieldNames = options.jsonTyper.fieldNames;

    this.fields = Object.fromEntries(
      fieldNames.map((fieldName) => [
        fieldName,
        new NoteFieldExternalState({
          typer: this.jsonTyper.getTyper(fieldName),
        }),
      ])
    ) as Record<TKey, NoteFieldExternalState>;
  }

  toJSON() {
    return this.service.serialize();
  }

  dispose() {
    this.jsonTyper.dispose();
    for (const field of Object.values<NoteFieldExternalState>(this.fields)) {
      field.dispose();
    }
  }
}

class NoteFieldExternalState {
  readonly editor;

  readonly valueVar;

  private readonly disposeHandlers: () => void;

  constructor({ typer }: { typer: CollabTyper }) {
    this.editor = typer;

    this.valueVar = makeVar<string>(this.editor.value);

    const offList = [
      this.editor.on('value:changed', ({ newValue }) => {
        this.valueVar(newValue);
      }),
    ];

    this.disposeHandlers = () => {
      offList.forEach((off) => {
        off();
      });
    };
  }

  dispose() {
    this.disposeHandlers();
  }
}
