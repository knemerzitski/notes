import { describe, expect, it } from 'vitest';

import { Changeset } from '../changeset/changeset';
import { RevisionChangeset } from '../changeset/revision-changeset';

import { CollaborativeEditor } from './collaborative-editor';

const cs = (...values: unknown[]) => Changeset.parseValue(values);

describe('CollaborativeEditor', () => {
  describe('constructor', () => {
    it('sets correct initial document state', () => {
      const editor = new CollaborativeEditor({
        headText: new RevisionChangeset(4, cs('initial text')),
      });

      expect(editor.documentRevision).toStrictEqual(4);
      expect(editor.documentServer.toString()).toStrictEqual(
        cs('initial text').toString()
      );
      expect(editor.documentSubmitted.toString()).toStrictEqual(cs([0, 11]).toString());
      expect(editor.documentLocal.toString()).toStrictEqual(cs([0, 11]).toString());
      expect(editor.documentView.toString()).toStrictEqual(cs('initial text').toString());
      expect(editor.value).toStrictEqual('initial text');
    });
  });

  describe('haveSubmittedChanges', () => {
    it('has submitted changes if any text was inserted', () => {
      const editor = new CollaborativeEditor();

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
    it('returns submitted changes with revision', () => {
      const editor = new CollaborativeEditor();

      const changeset = cs('first insert');
      editor.insertText('first insert');

      const changes = editor.submitChanges();

      expect(changes).toStrictEqual(new RevisionChangeset(0, cs('first insert')));
      expect(editor.documentSubmitted).toStrictEqual(changeset);
      expect(editor.documentLocal).toStrictEqual(changeset.getIdentity());
    });
  });

  describe('handleSubmittedChangesAcknowledged', () => {
    it('handles next revision correctly', () => {
      const editor = new CollaborativeEditor();
      editor.insertText('changes');

      const changes = editor.submitChanges();

      expect(editor.documentServer).toStrictEqual(Changeset.EMPTY);
      expect(editor.documentSubmitted).toStrictEqual(changes.changeset);
      expect(editor.documentRevision).toStrictEqual(0);

      editor.submittedChangesAcknowledged(1);

      expect(editor.documentServer).toStrictEqual(changes.changeset);
      expect(editor.documentSubmitted).toStrictEqual(changes.changeset.getIdentity());
      expect(editor.documentRevision).toStrictEqual(1);
    });

    it('discards old revision', () => {
      const editor = new CollaborativeEditor();

      editor.submittedChangesAcknowledged(-6);
      expect(editor.documentRevision).toStrictEqual(0);
      editor.submittedChangesAcknowledged(1);
      expect(editor.documentRevision).toStrictEqual(1);
    });

    it('buffers new revision and processes it when missing revisions are received', () => {
      const editor = new CollaborativeEditor();

      editor.submittedChangesAcknowledged(3);
      expect(editor.documentRevision).toStrictEqual(0);
      editor.submittedChangesAcknowledged(2);
      expect(editor.documentRevision).toStrictEqual(0);
      editor.submittedChangesAcknowledged(1);
      expect(editor.documentRevision).toStrictEqual(3);
    });
  });

  describe('handleExternalChange', () => {
    it('handles next external change correctly', () => {
      const editor = new CollaborativeEditor();

      editor.insertText('server');
      editor.submitChanges();
      editor.submittedChangesAcknowledged(1);
      editor.insertText('; submitted');
      editor.submitChanges();
      editor.insertText('; local');
      editor.insertText('; more');

      editor.handleExternalChange(
        new RevisionChangeset(2, cs('external before - ', [0, 5], ' - external after'))
      );

      expect(editor.documentServer.toString()).toStrictEqual(
        cs('external before - server - external after').toString()
      );
      expect(editor.documentSubmitted.toString()).toStrictEqual(
        cs([0, 23], '; submitted', [24, 40]).toString()
      );
      expect(editor.documentLocal.toString()).toStrictEqual(
        cs([0, 34], '; local; more', [35, 51]).toString()
      );
      expect(editor.documentView.toString()).toStrictEqual(
        cs('external before - server; submitted; local; more - external after').toString()
      );
      expect(editor.documentRevision).toStrictEqual(2);
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
      const editor = new CollaborativeEditor();
      editor.insertText('hello world');
      expect(editor.value).toStrictEqual('hello world');
    });

    it('inserts between existing', () => {
      const editor = new CollaborativeEditor();
      editor.insertText('hello world');
      editor.setCaretPosition(5);
      editor.insertText(' between');
      expect(editor.value).toStrictEqual('hello between world');
    });
  });
});
