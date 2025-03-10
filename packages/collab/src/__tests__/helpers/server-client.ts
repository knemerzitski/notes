import mapObject, { mapObjectSkip } from 'map-obj';
import { assert, expect } from 'vitest';

import { OrderedMessageBuffer } from '../../../../utils/src/ordered-message-buffer';

import { CollabClient } from '../../client/collab-client';
import { CollabService, CollabServiceOptions } from '../../client/collab-service';
import { UserRecords } from '../../client/user-records';
import { SimpleTextEditor } from '../../editor/simple-text';
import { CollabHistory } from '../../history/collab-history';
import { processRecordInsertion } from '../../records/process-record-insertion';
import { ServerRevisionRecord } from '../../records/record';

import { RevisionRecords } from '../../records/revision-records';
import { SimpleTextOperationOptions } from '../../types';

import { newSelectionRange } from './collab-service-selection-range';
import { LocalServerRecords, LocalServerRecordsParams } from './server-records';
import {
  getValueWithSelection,
  parseTextWithMultipleSelections,
} from './text-with-selection';

export function createHelperCollabEditingEnvironment<TClientName extends string>(
  options: {
    server?: LocalServerRecordsParams<ServerRevisionRecord>;
    clientNames?: TClientName[];
    service?: Partial<Record<TClientName, CollabServiceOptions>>;
  } = {
    clientNames: [],
  }
) {
  const server = new LocalServerRecords<ServerRevisionRecord>({
    records: new RevisionRecords(),
    ...options.server,
  });

  const serverHelper = createRevisionTailRecordsHelper(server);
  const clientsHelperMap: Record<string, ReturnType<typeof createClientHelper>> = {};

  const disconnectedClients = new Set<string>();

  function getOtherCollabServices(name: string) {
    return mapObject(clientsHelperMap, (otherName, { service: otherService }) => {
      if (name === otherName || disconnectedClients.has(otherName)) return mapObjectSkip;
      return [otherName, otherService];
    });
  }

  function addNewClient(name: string, userId = name, options: CollabServiceOptions = {}) {
    const helper = {
      ...createClientHelper(name, userId, options, server, () =>
        getOtherCollabServices(name)
      ),
      disconnect: () => {
        disconnectedClients.add(name);
      },
      connect: () => {
        disconnectedClients.delete(name);
      },
    };
    clientsHelperMap[name] = helper;
    return helper;
  }

  options.clientNames?.forEach((name) => {
    addNewClient(name, name, options.service?.[name]);
  });

  function expectTextsConverged(
    textWithCursors: string,
    clientNames: string[] = Object.keys(clientsHelperMap)
  ) {
    const { rawText, textWithSelection } =
      parseTextWithMultipleSelections(textWithCursors);
    expect(serverHelper.headText(), 'server headText').toStrictEqual(rawText);
    clientNames.forEach((name, index) => {
      const client = clientsHelperMap[name];
      if (client) {
        expect(client.valueWithSelection(), `client ${name}`).toStrictEqual(
          textWithSelection[index]
        );
      }
    });
  }

  return {
    server: serverHelper,
    client: clientsHelperMap as Record<
      TClientName,
      ReturnType<typeof createClientHelper>
    >,
    addNewClient,
    expectTextsConverged,
  };
}

function createClientHelper<TName extends string>(
  name: TName,
  userId = name,
  currentOptions: CollabServiceOptions,
  server: LocalServerRecords<ServerRevisionRecord>,
  getOtherServices: () => Record<TName, CollabService>
) {
  const {
    client: clientOptions,
    history: historyOptions,
    ...editorOptions
  } = currentOptions;

  const client =
    clientOptions instanceof CollabClient
      ? clientOptions
      : new CollabClient({
          server: server.tailText.changeset,
          ...clientOptions,
        });
  const history =
    historyOptions instanceof CollabHistory
      ? historyOptions
      : new CollabHistory({
          serverTailRevision:
            editorOptions.recordsBuffer instanceof OrderedMessageBuffer
              ? editorOptions.recordsBuffer.currentVersion
              : editorOptions.recordsBuffer?.version,
          ...historyOptions,
          client,
        });

  const service = new CollabService({
    ...editorOptions,
    recordsBuffer: {
      version: server.tailText.revision,
      // eslint-disable-next-line @typescript-eslint/no-misused-spread
      ...editorOptions.recordsBuffer,
    },

    userRecords: new UserRecords({
      serverRecords: server,
      userId,
    }),
    client,
    history,
  });

  return {
    client,
    history,
    name,
    ...createCollabServiceHelper(service),
    ...createCollabServiceAndRevisionTailRecordsHelper<TName>(
      name,
      userId,
      service,
      server,
      getOtherServices
    ),
  };
}

function createCollabServiceHelper(service: CollabService) {
  const { selectionRange } = newSelectionRange(service);
  const plainText = new SimpleTextEditor(service);
  return {
    service,
    selectionRange,
    valueWithSelection: () => getValueWithSelection(service, selectionRange),
    setCaretFromValue: (textWithCursors: string) => {
      const pos1 = textWithCursors.indexOf('>');
      const pos2 = textWithCursors.indexOf('<');
      if (pos1 !== -1 && pos2 !== -1) {
        selectionRange.set(pos1, pos2 - 1);
      } else if (pos1 !== -1) {
        selectionRange.set(pos1);
      } else if (pos2 !== -1) {
        selectionRange.set(pos2);
      }
    },
    setCaretPosition(pos: number) {
      selectionRange.set(pos);
    },
    insertText(value: string, options?: SimpleTextOperationOptions) {
      plainText.insert(value, selectionRange, options);
    },
    deleteTextCount(count = 1, options?: SimpleTextOperationOptions) {
      plainText.delete(count, selectionRange, options);
    },
  };
}

function createRevisionTailRecordsHelper(
  localRecords: LocalServerRecords<ServerRevisionRecord>
) {
  return {
    localRecords,
    headText: () => localRecords.getHeadText().changeset.joinInsertions(),
  };
}

function createCollabServiceAndRevisionTailRecordsHelper<TClientName extends string>(
  name: TClientName,
  userId = name,
  service: CollabService,
  localRecords: LocalServerRecords<ServerRevisionRecord>,
  getOtherServices: () => Record<TClientName, CollabService>
) {
  function submitChanges() {
    const submittedRecord = service.submitChanges();
    assert(submittedRecord != null);

    const otherServices = getOtherServices();
    const allOtherNames = Object.keys(otherServices) as TClientName[];

    return {
      serverReceive: () => {
        const recordInsertion = processRecordInsertion({
          records: localRecords.records.items,
          tailText: localRecords.tailText,
          newRecord: {
            ...submittedRecord,
            creatorUserId: userId,
          },
        });

        if (recordInsertion.type === 'new') {
          localRecords.records.push(recordInsertion.record);
        }

        function clientAcknowledge() {
          service.submittedChangesAcknowledged(recordInsertion.record);
          return recordInsertion.record;
        }

        function sendToOtherClients(clientNames: TClientName[] = allOtherNames) {
          clientNames.forEach((otherName) => {
            if (name === otherName || recordInsertion.type == 'duplicate') return;

            const otherService = otherServices[otherName];

            otherService.handleExternalChange(recordInsertion.record);
          });
          return recordInsertion.record;
        }

        function acknowledgeAndSendToOtherClients(
          clientNames: TClientName[] = allOtherNames
        ) {
          clientAcknowledge();
          sendToOtherClients(clientNames);
          return recordInsertion.record;
        }

        return {
          clientAcknowledge,
          sendToOtherClients,
          acknowledgeAndSendToOtherClients,
        };
      },
    };
  }

  return {
    submitChangesInstant: () => {
      const serverReceived = submitChanges().serverReceive();
      serverReceived.clientAcknowledge();
      serverReceived.sendToOtherClients();
    },
    submitChanges,
  };
}
