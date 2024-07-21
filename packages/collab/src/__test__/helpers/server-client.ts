import mapObject, { mapObjectSkip } from 'map-obj';
import { assert, expect } from 'vitest';

import { OrderedMessageBuffer } from '~utils/ordered-message-buffer';

import { CollabClient } from '../../client/collab-client';
import {
  CollabEditor,
  CollabEditorOptions,
  HistoryOperationOptions,
} from '../../client/collab-editor';
import { CollabHistory } from '../../client/collab-history';
import { UserRecords } from '../../client/user-records';
import { ChangesetRevisionRecords } from '../../records/changeset-revision-records';
import { ServerRevisionRecord } from '../../records/record';
import { newServerRecords } from '../../records/server-records';

import { newSelectionRange } from './collab-editor-selection-range';
import { LocalServerRecords, LocalServerRecordsParams } from './server-records';
import {
  getValueWithSelection,
  parseTextWithMultipleSelections,
} from './text-with-selection';

export function createHelperCollabEditingEnvironment<TClientName extends string>(
  options: {
    server?: LocalServerRecordsParams<ServerRevisionRecord>;
    clientNames?: TClientName[];
    editor?: Partial<Record<TClientName, CollabEditorOptions>>;
  } = {
    clientNames: [],
  }
) {
  const server = new LocalServerRecords<ServerRevisionRecord>({
    changesetRecords: new ChangesetRevisionRecords({
      revisionRecords: newServerRecords(),
    }),
    ...options.server,
  });

  const serverHelper = createRevisionTailRecordsHelper(server);
  const clientsHelperMap: Record<string, ReturnType<typeof createClientHelper>> = {};

  const disconnectedClients = new Set<string>();

  function getOtherEditors(name: string) {
    return mapObject(clientsHelperMap, (otherName, { editor: otherEditor }) => {
      if (name === otherName || disconnectedClients.has(otherName)) return mapObjectSkip;
      return [otherName, otherEditor];
    });
  }

  function addNewClient(name: string, userId = name, options: CollabEditorOptions = {}) {
    const helper = {
      ...createClientHelper(name, userId, options, server, () => getOtherEditors(name)),
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
    addNewClient(name, name, options.editor?.[name]);
  });

  function expectTextsConverted(
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
    expectTextsConverted,
  };
}

function createClientHelper<TName extends string>(
  name: TName,
  userId = name,
  currentOptions: CollabEditorOptions,
  server: LocalServerRecords<ServerRevisionRecord>,
  getOtherEditors: () => { [K in TName]: CollabEditor }
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
          tailRevision:
            editorOptions.recordsBuffer instanceof OrderedMessageBuffer
              ? editorOptions.recordsBuffer.currentVersion
              : editorOptions.recordsBuffer?.version,
          ...historyOptions,
          client,
        });

  const editor = new CollabEditor({
    ...editorOptions,
    recordsBuffer: {
      version: server.tailText.revision,
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
    ...createCollabEditorHelper(editor),
    ...createCollabEditorAndRevisionTailRecordsHelper<TName>(
      name,
      userId,
      editor,
      server,
      getOtherEditors
    ),
  };
}

function createCollabEditorHelper(editor: CollabEditor) {
  const { selectionRange } = newSelectionRange(editor);
  return {
    editor,
    selectionRange,
    valueWithSelection: () => getValueWithSelection(editor, selectionRange),
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
    insertText(value: string, options?: HistoryOperationOptions) {
      editor.insertText(value, selectionRange, options);
    },
    deleteTextCount(count = 1, options?: HistoryOperationOptions) {
      editor.deleteTextCount(count, selectionRange, options);
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

function createCollabEditorAndRevisionTailRecordsHelper<TClientName extends string>(
  name: TClientName,
  userId = name,
  editor: CollabEditor,
  localRecords: LocalServerRecords<ServerRevisionRecord>,
  getOtherEditors: () => { [Key in TClientName]: CollabEditor }
) {
  function submitChanges() {
    const submittedRecord = editor.submitChanges();
    assert(submittedRecord != null);

    const otherEditors = getOtherEditors();
    const allOtherNames = Object.keys(otherEditors) as TClientName[];

    return {
      serverReceive: () => {
        const recordInsertion = localRecords.changesetRecords.insert({
          ...submittedRecord,
          creatorUserId: userId,
        });

        function clientAcknowledge() {
          editor.submittedChangesAcknowledged(recordInsertion.processedRecord);
          return recordInsertion.processedRecord;
        }

        function sendToOtherClients(clientNames: TClientName[] = allOtherNames) {
          clientNames.forEach((otherName) => {
            if (name === otherName) return;

            const otherEditor = otherEditors[otherName];

            otherEditor.handleExternalChange(recordInsertion.processedRecord);
          });
          return recordInsertion.processedRecord;
        }

        function acknowledgeAndSendToOtherClients(
          clientNames: TClientName[] = allOtherNames
        ) {
          clientAcknowledge();
          sendToOtherClients(clientNames);
          return recordInsertion.processedRecord;
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
