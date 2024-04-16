import { assert, describe, expect, it } from 'vitest';

import { Changeset } from '../changeset/changeset';

import { CollabEditor } from './collab-editor';

const cs = (...values: unknown[]) => Changeset.parseValue(values);

describe('constructor', () => {
  it('sets correct initial document state', () => {
    const editor = new CollabEditor({
      head: {
        revision: 4,
        changeset: cs('initial text'),
      },
    });

    expect(editor.serverTextRevision).toStrictEqual(4);
    expect(editor.textServer.toString()).toStrictEqual(cs('initial text').toString());
    expect(editor.textSubmitted.toString()).toStrictEqual(cs([0, 11]).toString());
    expect(editor.textLocal.toString()).toStrictEqual(cs([0, 11]).toString());
    expect(editor.textView.toString()).toStrictEqual(cs('initial text').toString());
    expect(editor.value).toStrictEqual('initial text');
  });
});

describe('haveSubmittedChanges', () => {
  it('has submitted changes if any text was inserted', () => {
    const editor = new CollabEditor();

    expect(editor.haveSubmittedChanges()).toBeFalsy();
    editor.submitChanges();
    expect(editor.haveSubmittedChanges()).toBeFalsy();
    editor.insertText('hi');
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

    const changeset = cs('first insert');
    editor.insertText('first insert');

    const changes = editor.submitChanges();

    expect(changes).containSubset({ revision: 0, changeset: cs('first insert') });
    expect(editor.textSubmitted).toStrictEqual(changeset);
    expect(editor.textLocal).toStrictEqual(changeset.getIdentity());
  });
});

describe('handleSubmittedChangesAcknowledged', () => {
  it('handles next revision correctly', () => {
    const editor = new CollabEditor();
    editor.insertText('changes');

    const submitRecord = editor.submitChanges();
    assert(submitRecord != null);

    expect(editor.textServer).toStrictEqual(Changeset.EMPTY);
    expect(editor.textSubmitted).toStrictEqual(submitRecord.changeset);
    expect(editor.serverTextRevision).toStrictEqual(0);

    editor.submittedChangesAcknowledged({
      ...submitRecord,
      revision: 1,
    });

    expect(editor.textServer).toStrictEqual(submitRecord.changeset);
    expect(editor.textSubmitted).toStrictEqual(submitRecord.changeset.getIdentity());
    expect(editor.serverTextRevision).toStrictEqual(1);
  });

  it('discards old revision', () => {
    const editor = new CollabEditor();

    editor.submittedChangesAcknowledged({
      revision: -6,
      changeset: Changeset.EMPTY,
    });
    expect(editor.serverTextRevision).toStrictEqual(0);
    editor.submittedChangesAcknowledged({
      revision: 1,
      changeset: Changeset.EMPTY,
    });
    expect(editor.serverTextRevision).toStrictEqual(1);
  });

  it('buffers new revision and processes it when missing revisions are received', () => {
    const editor = new CollabEditor();

    editor.submittedChangesAcknowledged({
      revision: 3,
      changeset: Changeset.EMPTY,
    });
    expect(editor.serverTextRevision).toStrictEqual(0);
    editor.submittedChangesAcknowledged({
      revision: 2,
      changeset: Changeset.EMPTY,
    });
    expect(editor.serverTextRevision).toStrictEqual(0);
    editor.submittedChangesAcknowledged({
      revision: 1,
      changeset: Changeset.EMPTY,
    });
    expect(editor.serverTextRevision).toStrictEqual(3);
  });
});

describe('handleExternalChange', () => {
  it('handles next external change correctly', () => {
    const editor = new CollabEditor();

    editor.insertText('server');
    const record = editor.submitChanges();
    assert(record != null);
    editor.submittedChangesAcknowledged({
      ...record,
      revision: 1,
    });
    editor.insertText('; submitted');
    editor.submitChanges();
    editor.insertText('; local');
    editor.insertText('; more');

    editor.handleExternalChange({
      revision: 2,
      changeset: cs('external before - ', [0, 5], ' - external after'),
    });

    expect(editor.textServer.toString()).toStrictEqual(
      cs('external before - server - external after').toString()
    );
    expect(editor.textSubmitted.toString()).toStrictEqual(
      cs([0, 23], '; submitted', [24, 40]).toString()
    );
    expect(editor.textLocal.toString()).toStrictEqual(
      cs([0, 34], '; local; more', [35, 51]).toString()
    );
    expect(editor.textView.toString()).toStrictEqual(
      cs('external before - server; submitted; local; more - external after').toString()
    );
    expect(editor.serverTextRevision).toStrictEqual(2);
    expect(editor.value).toStrictEqual(
      'external before - server; submitted; local; more - external after'
    );
    expect(editor.selectionStart).toStrictEqual(48);
    expect(editor.selectionEnd).toStrictEqual(48);

    editor.undo();
    expect(editor.value).toStrictEqual(
      'external before - server; submitted; local - external after'
    );
    expect(editor.selectionStart).toStrictEqual(42);
    expect(editor.selectionEnd).toStrictEqual(42);

    editor.undo();
    expect(editor.value).toStrictEqual(
      'external before - server; submitted - external after'
    );
    expect(editor.selectionStart).toStrictEqual(35);
    expect(editor.selectionEnd).toStrictEqual(35);

    editor.undo();
    expect(editor.value).toStrictEqual('external before - server - external after');
    expect(editor.selectionStart).toStrictEqual(24);
    expect(editor.selectionEnd).toStrictEqual(24);
  });
});

describe('insertText', () => {
  it('inserts "hello world"', () => {
    const editor = new CollabEditor();
    editor.insertText('hello world');
    expect(editor.value).toStrictEqual('hello world');
  });

  it('inserts between existing', () => {
    const editor = new CollabEditor();
    editor.insertText('hello world');
    editor.setCaretPosition(5);
    editor.insertText(' between');
    expect(editor.value).toStrictEqual('hello between world');
  });
});
