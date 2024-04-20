/* eslint-disable @typescript-eslint/no-non-null-assertion */
import mitt, { Emitter } from 'mitt';

import { Changeset } from '../changeset/changeset';
import {
  ChangeSource,
  CollabClient,
  Events as CollabClientEvents,
} from '../client/collab-client';

import { ChangesetEditor } from './changeset-editor';
import { LocalChangesetEditorHistory } from './local-changeset-editor-history';
import {
  SelectionDirection,
  SelectionRange,
  Events as SelectionRangeEvents,
} from './selection-range';
import { OrderedMessageBuffer } from '../records/ordered-message-buffer';

import { EditorRecordsHistoryRestore } from './editor-records-history-restore';
import {
  RevisionChangeset,
  ServerRevisionRecord,
  SubmittedRevisionRecord,
} from '../records/record';
import { RevisionText } from '../records/revision-text';
import { nanoid } from 'nanoid';
import { PartialBy } from '~utils/types';

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

export type Events = Pick<CollabClientEvents, 'viewChange' | 'viewChanged'> &
  Pick<SelectionRangeEvents, 'selectionChanged'> &
  EditorEvents;

type LocalRecord = Omit<ServerRevisionRecord, 'userGeneratedId' | 'creatorUserId'>;
type ExternalRecord = PartialBy<
  Omit<ServerRevisionRecord, 'userGeneratedId'>,
  'beforeSelection' | 'afterSelection' | 'creatorUserId'
>;
export type EditorRevisionRecord = LocalRecord | ExternalRecord;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RecordsBufferMessages = {
  submittedChangesAcknowledged: EditorRevisionRecord;
  externalChange: EditorRevisionRecord;
};

export interface CollabEditorOptions {
  initialText?:
    | { headText: RevisionChangeset }
    | {
        tailText: RevisionChangeset;
        records: EditorRevisionRecord[];
      };
  userId?: string;
  caretPosition?: number;
  eventBus?: Emitter<Events>;
  generateSubmitId?: () => string;
}

export class CollabEditor {
  readonly userId?: string;

  private selection: SelectionRange;
  private changesetEditor: ChangesetEditor;
  private client: CollabClient;
  private recordsBuffer: OrderedMessageBuffer<RecordsBufferMessages>;
  private serverRecords: RevisionText<EditorRevisionRecord>;
  private history: LocalChangesetEditorHistory;
  private historyRestorer: EditorRecordsHistoryRestore<EditorRevisionRecord>;
  private lastSubmittedRecord: SubmittedRevisionRecord | null = null;

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
   * Local changes apply to this server revision.
   */
  get localRevision() {
    return this.recordsBuffer.currentVersion;
  }

  get textServer() {
    return this.client.server;
  }

  get textSubmitted() {
    return this.client.submitted;
  }

  get textLocal() {
    return this.client.local;
  }

  get textView() {
    return this.client.view;
  }

  get recordsTailRevision() {
    return this.serverRecords.tailRevision;
  }

  get recordsHeadRevision() {
    return this.serverRecords.headRevision;
  }

  get historyCurrentIndex() {
    return this.history.currentIndex;
  }

  get historyEntryCount() {
    return this.history.entries.length;
  }

  get historyEntries() {
    return this.history.entries;
  }

  constructor(options?: CollabEditorOptions) {
    let headText: RevisionChangeset;
    if (options?.initialText) {
      const { initialText } = options;
      if ('tailText' in initialText) {
        this.serverRecords = new RevisionText({
          tailText: initialText.tailText,
          revisionRecords: {
            records: initialText.records,
          },
        });
        headText = this.serverRecords.getHeadText();
      } else {
        this.serverRecords = new RevisionText();
        headText = initialText.headText;
      }
    } else {
      this.serverRecords = new RevisionText();
      headText = this.serverRecords.getHeadText();
    }

    this._value = headText.changeset.strips.joinInsertions();
    this.userId = options?.userId;

    this.generateSubmitId = options?.generateSubmitId ?? (() => nanoid(6));

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
    this.client = new CollabClient({
      initialServerText: headText.changeset,
    });
    this.client.eventBus.on('viewChanged', ({ view, change, source }) => {
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
      initialVersion: headText.revision,
    });
    this.recordsBuffer.messageBus.on('submittedChangesAcknowledged', (record) => {
      this.lastSubmittedRecord = null;
      this.serverRecords.update([record]);
      this.client.submittedChangesAcknowledged();
    });
    this.recordsBuffer.messageBus.on('externalChange', (record) => {
      this.serverRecords.update([record]);
      this.client.handleExternalChange(record.changeset);
    });

    // Store known records from server
    this.serverRecords = new RevisionText();

    // History for selection and local changeset
    this.history = new LocalChangesetEditorHistory({
      selection: this.selection,
      editorBus: this.changesetEditor.eventBus,
      client: this.client,
    });

    // Restores history from server records
    this.historyRestorer = new EditorRecordsHistoryRestore({
      history: this.history,
      records: this.serverRecords,
      historyTailRevision: headText.revision,
    });

    // Link events
    this.eventBus = options?.eventBus ?? mitt();

    this.selection.eventBus.on('selectionChanged', (e) => {
      this.eventBus.emit('selectionChanged', e);
    });

    this.client.eventBus.on('viewChange', (e) => {
      this.eventBus.emit('viewChange', e);
    });

    this.client.eventBus.on('viewChanged', (e) => {
      this.eventBus.emit('viewChanged', e);
    });

    this.recordsBuffer.eventBus.on('messagesProcessed', () => {
      this.eventBus.emit('revisionChanged', {
        revision: this.localRevision,
        changeset: this.client.server,
      });
    });
  }

  haveSubmittedChanges() {
    return this.client.haveSubmittedChanges();
  }

  haveLocalChanges() {
    return this.client.haveLocalChanges();
  }

  canSubmitChanges() {
    return this.client.canSubmitChanges();
  }

  /**
   *
   * @returns Revision changeset that can be send to the server. Contains all
   * changes since last submission. Returns undefined if changes cannot be submitted.
   * Either due to existing submitted changes or no local changes exist.
   */
  submitChanges(): SubmittedRevisionRecord | undefined | null {
    if (this.client.submitChanges()) {
      const lastEntry = this.history.at(-1);
      if (!lastEntry) return;

      const beforeSelection: SubmittedRevisionRecord['beforeSelection'] = {
        start: 0,
      };
      const afterSelection: SubmittedRevisionRecord['afterSelection'] = {
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
        userGeneratedId: this.generateSubmitId(),
        revision: this.localRevision,
        changeset: this.client.submitted,
        beforeSelection,
        afterSelection,
      };
    }

    return this.lastSubmittedRecord;
  }

  /**
   * Acknowledge submitted changes.
   */
  submittedChangesAcknowledged(record: EditorRevisionRecord) {
    this.recordsBuffer.add('submittedChangesAcknowledged', record.revision, record);
  }

  /**
   * Handles external change that is created by another client during
   * collab editing.
   */
  handleExternalChange(record: EditorRevisionRecord) {
    this.recordsBuffer.add('externalChange', record.revision, record);
  }

  addServerRecords(
    records: Readonly<EditorRevisionRecord[]>,
    newTailText?: RevisionChangeset
  ) {
    if (newTailText) {
      this.serverRecords.updateWithTailText(newTailText, records);
    } else {
      this.serverRecords.update(records);
    }
  }

  /**
   * Restores up to {@link desiredRestoreCount} history entries. Server records
   * must be available. Add them using method {@link addServerRecords}.
   */
  historyRestore(desiredRestoreCount: number): number | false {
    return this.historyRestorer.restore(desiredRestoreCount, this.userId);
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
