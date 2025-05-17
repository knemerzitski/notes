import {
  array,
  assign,
  enums,
  literal,
  nullable,
  number,
  object,
  optional,
  pick,
  string,
  union,
} from 'superstruct';

import { ChangesetStruct } from '../../common/changeset';
import { SelectionStruct } from '../../common/selection';

import { SerializedState, Serializer, State } from './types';

const ServerRecordStruct = object({
  revision: number(),
  authorId: string(),
  changeset: ChangesetStruct,
  inverse: ChangesetStruct,
  selectionInverse: SelectionStruct,
  selection: SelectionStruct,
});

const ViewHistoryServiceRecordStruct = assign(
  object({
    type: literal('view'),
    viewIndex: number(),
    externalChanges: array(ChangesetStruct),
  }),
  pick(ServerRecordStruct, ['changeset', 'inverse', 'selectionInverse', 'selection'])
);

const ServerHistoryServiceRecordStruct = object({
  type: literal('server'),
  revision: number(),
  externrevisionalChanges: optional(number()),
});

const HistoryServiceRecordStruct = union([
  ViewHistoryServiceRecordStruct,
  ServerHistoryServiceRecordStruct,
]);

const LocalServiceRecordStruct = pick(ServerRecordStruct, [
  'changeset',
  'selectionInverse',
  'selection',
]);

const SubmittedServiceRecordStruct = object({
  id: string(),
  targetRevision: number(),
  changeset: ChangesetStruct,
  selectionInverse: SelectionStruct,
  selection: SelectionStruct,
});

const ServiceServerRecordStruct = pick(ServerRecordStruct, [
  'revision',
  'authorId',
  'changeset',
  'selectionInverse',
  'selection',
]);

const BaseViewRecord = object({
  viewRevision: number(),
});

const ViewRecordStruct = assign(
  pick(ServerRecordStruct, ['changeset', 'inverse']),
  BaseViewRecord
);

const LocalTypingRecordStruct = assign(
  pick(ServerRecordStruct, ['changeset', 'selection']),
  BaseViewRecord
);

const ExternalTypingRecordRecord = assign(
  pick(ServerRecordStruct, ['changeset']),
  BaseViewRecord
);

const IncomingServerMessageStruct = object({
  type: enums(['local-typing-acknowledged', 'external-typing']),
  item: ServiceServerRecordStruct,
});

const StateStruct = object({
  undoStack: array(HistoryServiceRecordStruct),
  undoStackTypeServerIndexes: array(number()),
  redoStack: array(HistoryServiceRecordStruct),
  viewIndexOffset: number(),
  localRecord: nullable(LocalServiceRecordStruct),
  submittedRecord: nullable(SubmittedServiceRecordStruct),
  serverRevision: number(),
  serverText: ChangesetStruct,
  viewText: ChangesetStruct,
  viewChanges: array(ViewRecordStruct),
  viewRevision: number(),

  tmpRecipeResults: object({
    externalTypings: array(ExternalTypingRecordRecord),
    localTypings: array(LocalTypingRecordStruct),
  }),

  messagesQueue: array(IncomingServerMessageStruct),
  missingMessageRevisions: nullable(
    object({
      startRevision: number(),
      endRevision: number(),
    })
  ),
});

export class StructSerializer implements Serializer {
  serialize(state: State): SerializedState {
    return StateStruct.mask(state);
  }

  deserialize(serializedState: SerializedState): State {
    return StateStruct.mask(serializedState);
  }
}
