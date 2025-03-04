import mapObject from 'map-obj';
import { coerce, instance, type, unknown } from 'superstruct';

import { CollabService, CollabServiceOptions } from '../../../../collab/src/client/collab-service';

import { defineCreateJsonTextFromService } from '../../../../collab/src/editor/json-text';
import { createLogger } from '../../../../utils/src/logging';

import { NoteTextFieldName } from '../../__generated__/graphql';

import { NoteFieldExternalState } from './note-field';

function getLogger(options: Pick<CollabServiceOptions, 'logger'> | undefined) {
  if (import.meta.env.PROD) {
    return;
  }

  if (options?.logger) {
    return options.logger;
  }

  return createLogger('collab-service');
}

const createJsonTextFromService = defineCreateJsonTextFromService(
  Object.values(NoteTextFieldName)
);

type NoteMultiText = ReturnType<typeof createJsonTextFromService>;
export type NoteTextFieldEditor = ReturnType<NoteMultiText['getText']>;

export interface NoteExternalStateOptions {
  service?: CollabServiceOptions;
}

export class NoteExternalState {
  readonly service;
  private readonly multiText;

  readonly fields: Record<NoteTextFieldName, NoteFieldExternalState>;

  constructor(options?: NoteExternalStateOptions) {
    this.service = new CollabService({
      ...options?.service,
      logger: getLogger(options?.service),
    });

    this.multiText = createJsonTextFromService(this.service);

    this.fields = mapObject(NoteTextFieldName, (_fieldName, fieldKey) => [
      fieldKey,
      new NoteFieldExternalState({
        editor: this.multiText.getText(fieldKey),
      }),
    ]);
  }

  toJSON() {
    return NoteExternalStateStruct.createRaw(this);
  }

  static parseValue(value: unknown) {
    return NoteExternalStateStruct.create(value);
  }

  cleanUp() {
    this.service.cleanUp();
    this.multiText.cleanUp();
    Object.values(this.fields).forEach((field) => {
      field.cleanUp();
    });
  }
}

const NoteExternalStateStruct = coerce(
  instance(NoteExternalState),
  type({
    service: unknown(),
  }),
  (value) =>
    new NoteExternalState({
      service: CollabService.parseValue(value.service),
    }),
  (state) => ({
    service: state.service.serialize(),
  })
);
