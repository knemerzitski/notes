import mapObject, { mapObjectSkip } from 'map-obj';
import { assert, expect } from 'vitest';
import { CollabEditor } from '../../editor/collab-editor';
import { ServerRevisionRecord } from '../../records/record';
import { RevisionText } from '../../records/revision-text';
import {
  getValueWithSelection,
  parseTextWithMultipleSelections,
} from './text-with-selection';

export function createServerClientsHelper<TClientName extends string>(
  server: RevisionText<ServerRevisionRecord>,
  clientMap: Record<TClientName, CollabEditor>
) {
  const allClientNames = Object.keys(clientMap) as TClientName[];
  const serverHelper = createRevisionTailRecordsHelper(server);
  const clientHelper = mapObject(clientMap, (name, editor) => [
    name,
    {
      ...createCollabEditorHelper(editor),
      ...createCollabEditorAndRevisionTailRecordsHelper<TClientName>(
        name,
        editor,
        server,
        mapObject(clientMap, (otherName, otherEditor) => {
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
  return {
    instance: editor,
    valueWithSelection: () => getValueWithSelection(editor),
    setCaretFromValue: (textWithCursors: string) => {
      const pos1 = textWithCursors.indexOf('>');
      const pos2 = textWithCursors.indexOf('<');
      if (pos1 !== -1 && pos2 !== -1) {
        editor.setSelectionRange(pos1, pos2 - 1);
      } else if (pos1 !== -1) {
        editor.setCaretPosition(pos1);
      } else if (pos2 !== -1) {
        editor.setCaretPosition(pos2);
      }
    },
  };
}

function createRevisionTailRecordsHelper(
  revisionTailRecords: RevisionText<ServerRevisionRecord>
) {
  return {
    instance: revisionTailRecords,
    headText: () => revisionTailRecords.getHeadText().changeset.joinInsertions(),
  };
}

function createCollabEditorAndRevisionTailRecordsHelper<TClientName extends string>(
  name: TClientName,
  editor: CollabEditor,
  revisionTailRecords: RevisionText<ServerRevisionRecord>,
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
