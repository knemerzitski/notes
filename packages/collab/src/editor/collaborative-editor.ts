/* eslint-disable @typescript-eslint/no-non-null-assertion */
import mitt, { Emitter } from 'mitt';

import { Changeset, RevisionChangeset } from '../changeset/changeset';
import {
  ChangeSource,
  DocumentClient,
  Events as DocumentClientEvents,
} from '../client/document-client';
import {
  DocumentClientRevisionBuffer,
  Events as DocumentClientRevisionBufferEvents,
} from '../client/document-client-revision-buffer';

import { ChangesetEditor } from './changeset-editor';
import { LocalChangesetEditorHistory } from './local-changeset-editor-history';
import {
  SelectionDirection,
  SelectionRange,
  Events as SelectionRangeEvents,
} from './selection-range';

export type Events = Pick<DocumentClientEvents, 'viewChange' | 'viewChanged'> &
  Pick<SelectionRangeEvents, 'selectionChanged'> &
  Pick<DocumentClientRevisionBufferEvents, 'revisionChanged'>;

export interface CollaborativeEditorOptions {
  head?: RevisionChangeset;
  caretPosition?: number;
  eventBus?: Emitter<Events>;
}

export class CollaborativeEditor {
  private selection: SelectionRange;
  private changesetEditor: ChangesetEditor;
  private document: DocumentClient;
  private revisionBuffer: DocumentClientRevisionBuffer;
  private history: LocalChangesetEditorHistory;

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
    return this.revisionBuffer.currentRevision;
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

  constructor(options?: CollaborativeEditorOptions) {
    const head = options?.head ?? { revision: 0, changeset: Changeset.EMPTY };
    this._value = head.changeset.strips.joinInsertions();

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
      initialServerChangeset: new Changeset(head.changeset.strips),
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
    this.revisionBuffer = new DocumentClientRevisionBuffer({
      document: this.document,
      bufferOptions: {
        initialVersion: head.revision,
      },
    });

    // History for selection and local changeset
    this.history = new LocalChangesetEditorHistory({
      selection: this.selection,
      editorBus: this.changesetEditor.eventBus,
      document: this.document,
    });

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

    this.revisionBuffer.eventBus.on('revisionChanged', (e) => {
      this.eventBus.emit('revisionChanged', e);
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
  submitChanges() {
    if (this.document.submitChanges()) {
      return {
        revision: this.revisionBuffer.currentRevision,
        changeset: this.document.submitted,
      };
    }
    return;
  }

  /**
   * Acknowledge submitted changes.
   */
  submittedChangesAcknowledged(revision: number) {
    this.revisionBuffer.addRevision('submittedChangesAcknowledged', revision);
  }

  /**
   * Handles external change that is created by another client during
   * collaborative editing.
   */
  handleExternalChange(changes: RevisionChangeset) {
    this.revisionBuffer.addRevision(
      'externalChange',
      changes.revision,
      changes.changeset
    );
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
