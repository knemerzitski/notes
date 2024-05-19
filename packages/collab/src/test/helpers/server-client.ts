import mapObject, { mapObjectSkip } from 'map-obj';
import { assert, expect } from 'vitest';
import {
  CollabEditor,
  CollabEditorOptions,
  HistoryOperationOptions,
} from '../../client/collab-editor';
import { ServerRevisionRecord } from '../../records/record';
import { RevisionTailRecords } from '../../records/revision-tail-records';
import {
  getValueWithSelection,
  parseTextWithMultipleSelections,
} from './text-with-selection';
import { CollabClient } from '../../client/collab-client';
import { CollabHistory } from '../../client/collab-history';
import { newSelectionRange } from './collab-editor-selection-range';
import { OrderedMessageBuffer } from '~utils/ordered-message-buffer';
import { UserEditorRecords } from '../../client/user-editor-records';
import { LocalServerRecords } from '../../records/server-records';

export function createHelperCollabEditingEnvironment<TClientName extends string>(
  server: RevisionTailRecords<ServerRevisionRecord>,
  clientNames: TClientName[],
  options?: Partial<Record<TClientName, Omit<CollabEditorOptions, 'userId'>>>
) {
  const serverHelper = createRevisionTailRecordsHelper(server);
  const clientsHelperMap: Record<string, ReturnType<typeof createClientHelper>> = {};

  function getOtherEditors(name: string) {
    return mapObject(clientsHelperMap, (otherName, { editor: otherEditor }) => {
      if (name === otherName) return mapObjectSkip;
      return [otherName, otherEditor];
    });
  }

  function addNewClient(name: string, options: Omit<CollabEditorOptions, 'userId'> = {}) {
    const helper = createClientHelper(name, options, server, () => getOtherEditors(name));
    clientsHelperMap[name] = helper;
    return helper;
  }

  clientNames.forEach((name) => {
    addNewClient(name, options?.[name]);
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
  currentOptions: Omit<CollabEditorOptions, 'userId'>,
  server: RevisionTailRecords<ServerRevisionRecord>,
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

  const editorServerRecords = new LocalServerRecords();
  const editor = new CollabEditor({
    ...editorOptions,
    recordsBuffer: {
      ...editorOptions.recordsBuffer,
      version: server.tailText.revision,
    },
    serverRecords: new UserEditorRecords({
      serverRecords: editorServerRecords,
      userId: name,
    }),
    client,
    history,
  });
  editor.eventBus.on('nextMessage', ({ record }) => {
    editorServerRecords.update([record]);
  });

  return {
    client,
    history,
    editorServerRecords,
    name,
    ...createCollabEditorHelper(editor),
    ...createCollabEditorAndRevisionTailRecordsHelper<TName>(
      name,
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
  revisionTailRecords: RevisionTailRecords<ServerRevisionRecord>
) {
  return {
    tailRecords: revisionTailRecords,
    headText: () => revisionTailRecords.getHeadText().changeset.joinInsertions(),
  };
}

function createCollabEditorAndRevisionTailRecordsHelper<TClientName extends string>(
  name: TClientName,
  editor: CollabEditor,
  revisionTailRecords: RevisionTailRecords<ServerRevisionRecord>,
  getOtherEditors: () => { [Key in TClientName]: CollabEditor }
) {
  function submitChanges() {
    const submittedRecord = editor.submitChanges();
    assert(submittedRecord != null);

    const otherEditors = getOtherEditors();
    const allOtherNames = Object.keys(otherEditors) as TClientName[];

    return {
      serverReceive: () => {
        const recordInsertion = revisionTailRecords.insert({
          ...submittedRecord,
          creatorUserId: name,
        });

        function clientAcknowledge() {
          editor.submittedChangesAcknowledged(recordInsertion.processedRecord);
        }

        function sendToOtherClients(clientNames: TClientName[] = allOtherNames) {
          clientNames.forEach((otherName) => {
            if (name === otherName) return;

            const otherEditor = otherEditors[otherName];

            otherEditor.handleExternalChange(recordInsertion.processedRecord);
          });
        }

        function acknowledgeAndSendToOtherClients(
          clientNames: TClientName[] = allOtherNames
        ) {
          clientAcknowledge();
          sendToOtherClients(clientNames);
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
