import { assert, describe, expect, it } from 'vitest';

import { newSelectionRange } from '../__test__/helpers/collab-editor-selection-range';
import { Changeset } from '../changeset/changeset';

import { CollabEditor } from './collab-editor';

const cs = (...values: unknown[]) => Changeset.parseValue(values);

describe('constructor', () => {
  it('sets correct initial document state', () => {
    const editor = CollabEditor.newFromHeadText({
      revision: 4,
      changeset: cs('initial text'),
    });

    expect(editor.headRevision).toStrictEqual(4);
    expect(editor.client.server.toString()).toStrictEqual(cs('initial text').toString());
    expect(editor.client.submitted.toString()).toStrictEqual(cs([0, 11]).toString());
    expect(editor.client.local.toString()).toStrictEqual(cs([0, 11]).toString());
    expect(editor.client.view.toString()).toStrictEqual(cs('initial text').toString());
    expect(editor.viewText).toStrictEqual('initial text');
  });
});

describe('haveSubmittedChanges', () => {
  it('has submitted changes if any text was inserted', () => {
    const editor = new CollabEditor();
    const { selectionRange } = newSelectionRange(editor);

    expect(editor.haveSubmittedChanges()).toBeFalsy();
    editor.submitChanges();
    expect(editor.haveSubmittedChanges()).toBeFalsy();
    editor.insertText('hi', selectionRange);
    expect(editor.haveSubmittedChanges()).toBeFalsy();
    editor.submitChanges();
    expect(editor.haveSubmittedChanges()).toBeTruthy();
  });
});

describe('submitChanges', () => {
  it('returns undefined or null if have no local changes', () => {
    const editor = new CollabEditor();
    expect(editor.submitChanges()).toBeFalsy();
  });

  it('returns submitted changes with revision', () => {
    const editor = new CollabEditor();
    const { selectionRange } = newSelectionRange(editor);

    const changeset = cs('first insert');
    editor.insertText('first insert', selectionRange);

    const changes = editor.submitChanges();

    expect(changes).containSubset({ revision: 0, changeset: cs('first insert') });
    expect(editor.client.submitted).toStrictEqual(changeset);
    expect(editor.client.local).toStrictEqual(changeset.getIdentity());
  });
});

describe('handleSubmittedChangesAcknowledged', () => {
  it('handles next revision correctly', () => {
    const editor = new CollabEditor();
    const { selectionRange } = newSelectionRange(editor);
    editor.insertText('changes', selectionRange);

    const submitRecord = editor.submitChanges();
    assert(submitRecord != null);

    expect(editor.client.server).toStrictEqual(Changeset.EMPTY);
    expect(editor.client.submitted).toStrictEqual(submitRecord.changeset);
    expect(editor.headRevision).toStrictEqual(0);

    editor.submittedChangesAcknowledged({
      ...submitRecord,
      revision: 1,
    });

    expect(editor.client.server.toString()).toStrictEqual(
      submitRecord.changeset.toString()
    );
    expect(editor.client.submitted.toString()).toStrictEqual(
      submitRecord.changeset.getIdentity().toString()
    );
    expect(editor.headRevision).toStrictEqual(1);
  });

  it('discards old revision', () => {
    const editor = new CollabEditor();

    editor.submittedChangesAcknowledged({
      revision: -6,
      changeset: Changeset.EMPTY,
    });
    expect(editor.headRevision).toStrictEqual(0);
    editor.submittedChangesAcknowledged({
      revision: 0,
      changeset: Changeset.EMPTY,
    });
    expect(editor.headRevision).toStrictEqual(0);
  });

  it('buffers new revision and processes it when missing revisions are received', () => {
    const editor = new CollabEditor();

    editor.submittedChangesAcknowledged({
      revision: 3,
      changeset: Changeset.EMPTY,
    });
    expect(editor.headRevision).toStrictEqual(0);
    editor.submittedChangesAcknowledged({
      revision: 2,
      changeset: Changeset.EMPTY,
    });
    expect(editor.headRevision).toStrictEqual(0);
    editor.submittedChangesAcknowledged({
      revision: 1,
      changeset: Changeset.EMPTY,
    });
    expect(editor.headRevision).toStrictEqual(3);
  });
});

describe('handleExternalChange', () => {
  it('handles next external change correctly', () => {
    const editor = new CollabEditor();
    const { selectionRange } = newSelectionRange(editor);

    editor.insertText('server', selectionRange);
    expect(selectionRange.start).toStrictEqual(6);
    const record = editor.submitChanges();
    assert(record != null);
    editor.submittedChangesAcknowledged({
      ...record,
      revision: 1,
    });
    editor.insertText('; submitted', selectionRange);
    expect(selectionRange.start).toStrictEqual(17);
    editor.submitChanges();
    editor.insertText('; local', selectionRange);
    expect(selectionRange.start).toStrictEqual(24);
    editor.insertText('; more', selectionRange);
    expect(selectionRange.start).toStrictEqual(30);

    editor.handleExternalChange({
      revision: 2,
      changeset: cs('external before - ', [0, 5], ' - external after'),
    });

    expect(editor.client.server.toString()).toStrictEqual(
      cs('external before - server - external after').toString()
    );
    expect(editor.client.submitted.toString()).toStrictEqual(
      cs([0, 23], '; submitted', [24, 40]).toString()
    );
    expect(editor.client.local.toString()).toStrictEqual(
      cs([0, 34], '; local; more', [35, 51]).toString()
    );
    expect(editor.client.view.toString()).toStrictEqual(
      cs('external before - server; submitted; local; more - external after').toString()
    );
    expect(editor.headRevision).toStrictEqual(2);
    expect(editor.viewText).toStrictEqual(
      'external before - server; submitted; local; more - external after'
    );
    expect(selectionRange.start).toStrictEqual(48);
    expect(selectionRange.end).toStrictEqual(48);

    editor.undo();
    expect(editor.viewText).toStrictEqual(
      'external before - server; submitted; local - external after'
    );
    expect(selectionRange.start).toStrictEqual(42);
    expect(selectionRange.end).toStrictEqual(42);

    editor.undo();
    expect(editor.viewText).toStrictEqual(
      'external before - server; submitted - external after'
    );
    expect(selectionRange.start).toStrictEqual(35);
    expect(selectionRange.end).toStrictEqual(35);

    editor.undo();
    expect(editor.viewText).toStrictEqual('external before - server - external after');
    expect(selectionRange.start).toStrictEqual(24);
    expect(selectionRange.end).toStrictEqual(24);
  });
});

describe('insertText', () => {
  it('inserts "hello world"', () => {
    const editor = new CollabEditor();
    const { selectionRange } = newSelectionRange(editor);
    editor.insertText('hello world', selectionRange);
    expect(editor.viewText).toStrictEqual('hello world');
  });

  it('inserts between existing', () => {
    const editor = new CollabEditor();
    const { selectionRange } = newSelectionRange(editor);
    editor.insertText('hello world', selectionRange);
    selectionRange.set(5);
    editor.insertText(' between', selectionRange);
    expect(editor.viewText).toStrictEqual('hello between world');
  });
});
