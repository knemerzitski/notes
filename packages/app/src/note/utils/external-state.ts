import { makeVar } from '@apollo/client';
import { coerce, instance, Struct, type, unknown } from 'superstruct';

import {
  CollabService,
  CollabServiceOptions,
} from '../../../../collab/src/client/collab-service';

import { defineCreateJsonTextFromService } from '../../../../collab/src/editor/json-text';

import { Logger } from '../../../../utils/src/logging';

export function createNoteExternalStateContext<TKey extends string>(
  { keys }: { keys: [TKey, ...TKey[]] },
  options?: {
    defaultKey?: TKey;
    logger?: Logger;
  }
) {
  const createJsonTextFromService = defineCreateJsonTextFromService(keys, {
    defaultKey: options?.defaultKey,
    logger: options?.logger,
  });

  const Struct = createNoteExternalStateStruct(newValue);

  const rootOptions = options;

  function newValue(
    options?: Pick<ConstructorParameters<typeof NoteExternalState<TKey>>[0], 'service'>
  ): NoteExternalState<TKey> {
    return new NoteExternalState<TKey>({
      ...options,
      service: {
        logger: rootOptions?.logger,
        ...options?.service,
      },
      keys,
      createJsonTextFromService,
      Struct,
    });
  }

  function parseValue(value: unknown) {
    return Struct.create(value);
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

type CreateJsonTextFromService<TKey extends string> =
  NoteExternalStateOptions<TKey>['createJsonTextFromService'];

type NoteMultiText<TKey extends string> = ReturnType<CreateJsonTextFromService<TKey>>;
export type NoteTextFieldEditor<TKey extends string> = ReturnType<
  NoteMultiText<TKey>['getText']
>;

export interface NoteExternalStateOptions<TKey extends string> {
  keys: TKey[];
  createJsonTextFromService: ReturnType<typeof defineCreateJsonTextFromService<TKey>>;
  service?: CollabServiceOptions;
  Struct: Struct<
    NoteExternalState<TKey>,
    null,
    {
      service: unknown;
    }
  >;
}

export class NoteExternalState<TKey extends string> {
  private readonly Struct;

  readonly service: CollabService;
  private readonly multiText;

  readonly fields: Record<TKey, NoteFieldExternalState<TKey>>;

  constructor({
    keys,
    createJsonTextFromService,
    service,
    Struct,
  }: NoteExternalStateOptions<TKey>) {
    this.Struct = Struct;
    this.service = new CollabService({
      ...service,
    });

    this.multiText = createJsonTextFromService(this.service);

    this.fields = Object.fromEntries(
      keys.map((fieldKey) => [
        fieldKey,
        new NoteFieldExternalState({
          editor: this.multiText.getText(fieldKey),
        }),
      ])
    ) as Record<TKey, NoteFieldExternalState<TKey>>;
  }

  toJSON() {
    return this.Struct.createRaw(this);
  }

  cleanUp() {
    this.service.cleanUp();
    this.multiText.cleanUp();
    Object.values<NoteFieldExternalState<TKey>>(this.fields).forEach((field) => {
      field.cleanUp();
    });
  }
}

function createNoteExternalStateStruct<TKey extends string>(
  newValue: (
    options?: Pick<ConstructorParameters<typeof NoteExternalState<TKey>>[0], 'service'>
  ) => NoteExternalState<TKey>
) {
  return coerce(
    instance(NoteExternalState<TKey>),
    type({
      service: unknown(),
    }),
    (value) =>
      newValue({
        service: CollabService.parseValue(value.service),
      }),
    (state) => ({
      service: state.service.serialize(),
    })
  );
}

interface NoteFieldExternalStateParams<TKey extends string> {
  editor: NoteTextFieldEditor<TKey>;
}

class NoteFieldExternalState<TKey extends string> {
  readonly editor;

  private readonly eventsOff;

  readonly valueVar;

  constructor({ editor }: NoteFieldExternalStateParams<TKey>) {
    this.editor = editor;

    this.valueVar = makeVar<string>(this.editor.value);

    this.eventsOff = [
      this.editor.eventBus.on('valueChanged', (newValue) => {
        this.valueVar(newValue);
      }),
    ];
  }

  cleanUp() {
    this.eventsOff.forEach((off) => {
      off();
    });
  }
}
