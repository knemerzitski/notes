/* eslint-disable @typescript-eslint/no-non-null-assertion */
import mitt, { Emitter } from 'mitt';

import { Changeset } from '../changeset/changeset';
import {
  ChangeSource,
  DocumentClient,
  Events as DocumentClientEvents,
} from '../client/document-client';

import { ChangesetEditor } from './changeset-editor';
import { LocalChangesetEditorHistory } from './local-changeset-editor-history';
import {
  SelectionDirection,
  SelectionRange,
  Events as SelectionRangeEvents,
} from './selection-range';
import { ClientRecord } from '../records/client-record';
import { RevisionRecords } from '../records/revision-records';
import { ServerRecord } from '../records/server-record';
import { RevisionChangeset } from '../records/revision-changeset';
import { PartialBy } from '~utils/types';
import { OrderedMessageBuffer } from '../records/ordered-message-buffer';

import { randomUUID } from 'crypto';
import { EditorRecordsHistoryRestore } from './editor-records-history-restore';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type EditorEvents = {
  revisionChanged: {
    /**
     * New revision.
     */
    revision: number;
    /**
     * Changeset that matches this revision.
     */
    changeset: Changeset;
  };
};

export type Events = Pick<DocumentClientEvents, 'viewChange' | 'viewChanged'> &
  Pick<SelectionRangeEvents, 'selectionChanged'> &
  EditorEvents;

export type LocalRecord = Omit<ServerRecord, 'clientId'>;
export type ExternalRecord = PartialBy<ServerRecord, 'selection'>;

export type EditorRecord = LocalRecord | ExternalRecord;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RecordsBufferMessages = {
  submittedChangesAcknowledged: EditorRecord;
  externalChange: EditorRecord;
};

export interface CollaborativeEditorOptions {
  head?: RevisionChangeset;
  clientId?: string;
  caretPosition?: number;
  eventBus?: Emitter<Events>;
  generateSubmitId?: () => string;
}

export class CollaborativeEditor {
  readonly clientId?: string;

  private selection: SelectionRange;
  private changesetEditor: ChangesetEditor;
  private document: DocumentClient;
  private recordsBuffer: OrderedMessageBuffer<RecordsBufferMessages>;
  private serverRecords: RevisionRecords<EditorRecord>;
  private history: LocalChangesetEditorHistory;
  private historyRestorer: EditorRecordsHistoryRestore<EditorRecord>;
  private lastSubmittedRecord: ClientRecord | null = null;

  private generateSubmitId: () => string;

  readonly eventBus: Emitter<Events>;

  private _value = '';
  get value() {
    return this._value;
  }

  get selectionDirection() {
    return this.selection.direction;
  }
  set selectionDirection(direction: SelectionDirection) {
    this.selection.direction = direction;
  }

  get selectionStart() {
    return this.selection.start;
  }
  set selectionStart(start: number) {
    this.selection.start = start;
  }

  get selectionEnd() {
    return this.selection.end;
  }
  set selectionEnd(end: number) {
    this.selection.end = end;
  }

  /**
   * Revision number that document is up to date with server.
   */
  get documentRevision() {
    return this.recordsBuffer.currentVersion;
  }

  get documentServer() {
    return this.document.server;
  }

  get documentSubmitted() {
    return this.document.submitted;
  }

  get documentLocal() {
    return this.document.local;
  }

  get documentView() {
    return this.document.view;
  }

  get serverRecordsTailRevision(){
    return this.serverRecords.tailRevision;
  }

  get serverRecordsHeadRevision(){
    return this.serverRecords.headRevision;
  }

  get historyCurrentIndex(){
    return this.history.currentIndex;
  }

  get historyEntryCount(){
    return this.history.entries.length;
  }

  get historyEntries(){
    return this.history.entries;
  }

  constructor(options?: CollaborativeEditorOptions) {
    const head = options?.head ?? { revision: 0, changeset: Changeset.EMPTY };
    this._value = head.changeset.strips.joinInsertions();
    this.clientId = options?.clientId;

    this.generateSubmitId = options?.generateSubmitId ?? randomUUID;

    // Range
    this.selection = new SelectionRange({
      getLength: () => {
        return this._value.length;
      },
    });
    if (options?.caretPosition) {
      this.selection.setPosition(options.caretPosition);
    }

    // Changeset editor
    this.changesetEditor = new ChangesetEditor({
      getValue: () => {
        return this._value;
      },
      selection: this.selection,
    });

    // Local, submitted, server changesets
    this.document = new DocumentClient({
      initialServerDocument: new Changeset(head.changeset.strips),
    });
    this.document.eventBus.on('viewChanged', ({ view, change, source }) => {
      this._value = view.strips.joinInsertions();

      // Position is set manually on local change, so update it only on external
      if (source === ChangeSource.External) {
        this.selection.setSelectionRange(
          change.followIndex(this.selection.start),
          change.followIndex(this.selection.end)
        );
      }
    });

    // Revision buffering
    this.recordsBuffer = new OrderedMessageBuffer({
      initialVersion: head.revision,
    });
    this.recordsBuffer.messageBus.on('submittedChangesAcknowledged', (record) => {
      this.lastSubmittedRecord = null;
      this.serverRecords.update([record]);
      this.document.submittedChangesAcknowledged();
    });
    this.recordsBuffer.messageBus.on('externalChange', (record) => {
      this.serverRecords.update([record]);
      this.document.handleExternalChange(record.changeset);
    });

    // Store known records from server
    this.serverRecords = new RevisionRecords<EditorRecord>();

    // History for selection and local changeset
    this.history = new LocalChangesetEditorHistory({
      selection: this.selection,
      editorBus: this.changesetEditor.eventBus,
      document: this.document,
    });

    // Restores history from server records
    this.historyRestorer = new EditorRecordsHistoryRestore({
      history: this.history,
      records: this.serverRecords,
      historyTailRevision: head.revision,
    })

    // Link events
    this.eventBus = options?.eventBus ?? mitt();

    this.selection.eventBus.on('selectionChanged', (e) => {
      this.eventBus.emit('selectionChanged', e);
    });

    this.document.eventBus.on('viewChange', (e) => {
      this.eventBus.emit('viewChange', e);
    });

    this.document.eventBus.on('viewChanged', (e) => {
      this.eventBus.emit('viewChanged', e);
    });

    this.recordsBuffer.eventBus.on('messagesProcessed', () => {
      this.eventBus.emit('revisionChanged', {
        revision: this.documentRevision,
        changeset: this.document.server,
      });
    });
  }

  haveSubmittedChanges() {
    return this.document.haveSubmittedChanges();
  }

  haveLocalChanges() {
    return this.document.haveLocalChanges();
  }

  canSubmitChanges() {
    return this.document.canSubmitChanges();
  }

  /**
   *
   * @returns Revision changeset that can be send to the server. Contains all
   * changes since last submission. Returns undefined if changes cannot be submitted.
   * Either due to existing submitted changes or no local changes exist.
   */
  submitChanges(): ClientRecord | undefined | null {
    if (this.document.submitChanges()) {
      const lastEntry = this.history.at(-1);
      if (!lastEntry) return;

      const beforeSelection: ClientRecord['selection']['before'] = {
        start: 0,
      };
      const afterSelection: ClientRecord['selection']['after'] = {
        start: 0,
      };

      beforeSelection.start = lastEntry.undo.selectionStart;
      if (lastEntry.undo.selectionStart !== lastEntry.undo.selectionEnd) {
        beforeSelection.end = lastEntry.undo.selectionEnd;
      }

      afterSelection.start = lastEntry.execute.selectionStart;
      if (lastEntry.execute.selectionStart !== lastEntry.execute.selectionEnd) {
        afterSelection.end = lastEntry.execute.selectionEnd;
      }

      this.lastSubmittedRecord = {
        generatedId: this.generateSubmitId(),
        revision: this.recordsBuffer.currentVersion,
        changeset: this.document.submitted,
        selection: {
          before: beforeSelection,
          after: afterSelection,
        },
      };
    }

    return this.lastSubmittedRecord;
  }

  /**
   * Acknowledge submitted changes.
   */
  submittedChangesAcknowledged(record: EditorRecord) {
    this.recordsBuffer.add('submittedChangesAcknowledged', record.revision, record);
  }

  /**
   * Handles external change that is created by another client during
   * collaborative editing.
   */
  handleExternalChange(record: EditorRecord) {
    this.recordsBuffer.add('externalChange', record.revision, record);
  }

  addServerRecords(
    records: Readonly<ServerRecord[]>,
    newTailDocument?: RevisionChangeset
  ) {
    this.serverRecords.update(records, newTailDocument);
  }

  /**
   * Restores up to {@link desiredRestoreCount} history entries. Server records
   * must be available. Add them using method {@link addServerRecords}.
   */
  historyRestore(desiredRestoreCount: number): number | false {
    return this.historyRestorer.restore(desiredRestoreCount, this.clientId);
  }

  /**
   * Insert text after caret position.
   * Anything selected is deleted.
   */
  insertText(insertText: string) {
    this.changesetEditor.insert(insertText);
  }

  /**
   * Delete based on current caret position towards left (Same as pressing backspace on a keyboard).
   * Anything selected is deleted and counts as 1 {@link count}.
   */
  deleteTextCount(count = 1) {
    this.changesetEditor.deleteCount(count);
  }

  setSelectionRange(start: number, end: number, direction?: SelectionDirection) {
    this.selection.setSelectionRange(start, end, direction);
  }

  // TODO allow by negative
  setCaretPosition(pos: number) {
    this.selection.setPosition(pos);
  }

  selectAll() {
    this.selection.selectAll();
  }

  undo() {
    this.history.undo();
  }

  redo() {
    this.history.redo();
  }
}
