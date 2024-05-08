import mapObject, { mapObjectSkip } from 'map-obj';
import { assert, expect } from 'vitest';
import { CollabEditor, HistoryOperationOptions } from '../../client/collab-editor';
import { ServerRevisionRecord } from '../../records/record';
import { RevisionTailRecords } from '../../records/revision-tail-records';
import {
  getValueWithSelection,
  parseTextWithMultipleSelections,
} from './text-with-selection';
import { CollabClient } from '../../client/collab-client';
import { CollabHistory } from '../../client/collab-history';
import { newSelectionRange } from './collab-editor-selection-range';

export function createHelperCollabEditingEnvironment<TClientName extends string>(
  server: RevisionTailRecords<ServerRevisionRecord>,
  clientNames: TClientName[]
) {
  const clientMap = clientNames
    .map((name) => {
      const client = new CollabClient();
      const history = new CollabHistory({
        client,
      });
      return [
        name,
        {
          client,
          history,
          editor: new CollabEditor({
            userId: name,
            client,
            history,
          }),
        },
      ] as [
        TClientName,
        {
          client: CollabClient;
          editor: CollabEditor;
          history: CollabHistory;
        },
      ];
    })
    .reduce(
      (map, [name, val]) => {
        map[name] = val;
        return map;
      },
      // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter
      {} as Record<
        TClientName,
        {
          client: CollabClient;
          editor: CollabEditor;
          history: CollabHistory;
        }
      >
    );

  const allClientNames = Object.keys(clientMap) as TClientName[];
  const serverHelper = createRevisionTailRecordsHelper(server);
  const clientHelper = mapObject(clientMap, (name, { editor, client, history }) => [
    name,
    {
      client,
      history,
      ...createCollabEditorHelper(editor),
      ...createCollabEditorAndRevisionTailRecordsHelper<TClientName>(
        name,
        editor,
        server,
        mapObject(clientMap, (otherName, { editor: otherEditor }) => {
          if (name === otherName) return mapObjectSkip;
          return [otherName, otherEditor];
        })
      ),
    },
  ]);
  return {
    server: serverHelper,
    client: clientHelper,
    expectTextsConverted: (
      textWithCursors: string,
      clientNames: TClientName[] = allClientNames
    ) => {
      const { rawText, textWithSelection } =
        parseTextWithMultipleSelections(textWithCursors);
      expect(serverHelper.headText(), 'server headText').toStrictEqual(rawText);
      clientNames.forEach((name, index) => {
        const client = clientHelper[name];
        expect(client.valueWithSelection(), `client ${name}`).toStrictEqual(
          textWithSelection[index]
        );
      });
    },
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
    instance: revisionTailRecords,
    headText: () => revisionTailRecords.getHeadText().changeset.joinInsertions(),
  };
}

function createCollabEditorAndRevisionTailRecordsHelper<TClientName extends string>(
  name: TClientName,
  editor: CollabEditor,
  revisionTailRecords: RevisionTailRecords<ServerRevisionRecord>,
  otherEditors: Record<TClientName, CollabEditor>
) {
  const allOtherNames = Object.keys(otherEditors) as TClientName[];

  function submitChanges() {
    const submittedRecord = editor.submitChanges();
    assert(submittedRecord != null);

    return {
      serverReceive: () => {
        const recordInsertion = revisionTailRecords.insert({
          ...submittedRecord,
          creatorUserId: editor.userId ?? 'user',
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
