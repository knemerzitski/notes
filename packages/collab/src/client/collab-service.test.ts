import { assert, describe, expect, it } from 'vitest';

import { newSelectionRange } from '../__tests__/helpers/collab-service-selection-range';

import { Changeset } from '../changeset';
import { SimpleTextEditor } from '../editor/simple-text';

import { CollabService } from './collab-service';

const cs = (...values: unknown[]) => Changeset.parseValue(values);

describe('constructor', () => {
  it('sets correct initial document state', () => {
    const service = CollabService.newFromHeadText({
      revision: 4,
      changeset: cs('initial text'),
    });

    expect(service.headRevision).toStrictEqual(4);
    expect(service.client.server.toString()).toStrictEqual(cs('initial text').toString());
    expect(service.client.submitted.toString()).toStrictEqual(cs([0, 11]).toString());
    expect(service.client.local.toString()).toStrictEqual(cs([0, 11]).toString());
    expect(service.client.view.toString()).toStrictEqual(cs('initial text').toString());
    expect(service.viewText).toStrictEqual('initial text');
  });
});

describe('haveSubmittedChanges', () => {
  it('has submitted changes if any text was inserted', () => {
    const service = new CollabService();
    const plainText = new SimpleTextEditor(service);
    const { selectionRange } = newSelectionRange(service);

    expect(service.haveSubmittedChanges()).toBeFalsy();
    service.submitChanges();
    expect(service.haveSubmittedChanges()).toBeFalsy();
    plainText.insert('hi', selectionRange);
    expect(service.haveSubmittedChanges()).toBeFalsy();
    service.submitChanges();
    expect(service.haveSubmittedChanges()).toBeTruthy();
  });
});

describe('submitChanges', () => {
  it('returns undefined or null if have no local changes', () => {
    const service = new CollabService();
    expect(service.submitChanges()).toBeFalsy();
  });

  it('returns submitted changes with revision', () => {
    const service = new CollabService();
    const plainText = new SimpleTextEditor(service);
    const { selectionRange } = newSelectionRange(service);

    const changeset = cs('first insert');
    plainText.insert('first insert', selectionRange);

    const changes = service.submitChanges();

    expect(changes).containSubset({ revision: 0, changeset: cs('first insert') });
    expect(service.client.submitted).toStrictEqual(changeset);
    expect(service.client.local).toStrictEqual(changeset.getIdentity());
  });
});

describe('handleSubmittedChangesAcknowledged', () => {
  it('handles next revision correctly', () => {
    const service = new CollabService();
    const plainText = new SimpleTextEditor(service);
    const { selectionRange } = newSelectionRange(service);
    plainText.insert('changes', selectionRange);

    const submitRecord = service.submitChanges();
    assert(submitRecord != null);

    expect(service.client.server).toStrictEqual(Changeset.EMPTY);
    expect(service.client.submitted).toStrictEqual(submitRecord.changeset);
    expect(service.headRevision).toStrictEqual(0);

    service.submittedChangesAcknowledged({
      ...submitRecord,
      revision: 1,
    });

    expect(service.client.server.toString()).toStrictEqual(
      submitRecord.changeset.toString()
    );
    expect(service.client.submitted.toString()).toStrictEqual(
      submitRecord.changeset.getIdentity().toString()
    );
    expect(service.headRevision).toStrictEqual(1);
  });

  it('discards old revision', () => {
    const service = new CollabService();

    service.submittedChangesAcknowledged({
      revision: -6,
      changeset: Changeset.EMPTY,
    });
    expect(service.headRevision).toStrictEqual(0);
    service.submittedChangesAcknowledged({
      revision: 0,
      changeset: Changeset.EMPTY,
    });
    expect(service.headRevision).toStrictEqual(0);
  });

  it('buffers new revision and processes it when missing revisions are received', () => {
    const service = new CollabService();

    service.submittedChangesAcknowledged({
      revision: 3,
      changeset: Changeset.EMPTY,
    });
    expect(service.headRevision).toStrictEqual(0);
    service.submittedChangesAcknowledged({
      revision: 2,
      changeset: Changeset.EMPTY,
    });
    expect(service.headRevision).toStrictEqual(0);
    service.submittedChangesAcknowledged({
      revision: 1,
      changeset: Changeset.EMPTY,
    });
    expect(service.headRevision).toStrictEqual(3);
  });
});

describe('handleExternalChange', () => {
  it('handles next external change correctly', () => {
    const service = new CollabService();
    const plainText = new SimpleTextEditor(service);
    const { selectionRange } = newSelectionRange(service);

    plainText.insert('server', selectionRange);
    expect(selectionRange.start).toStrictEqual(6);
    const record = service.submitChanges();
    assert(record != null);
    service.submittedChangesAcknowledged({
      ...record,
      revision: 1,
    });
    plainText.insert('; submitted', selectionRange);
    expect(selectionRange.start).toStrictEqual(17);
    service.submitChanges();
    plainText.insert('; local', selectionRange);
    expect(selectionRange.start).toStrictEqual(24);
    plainText.insert('; more', selectionRange);
    expect(selectionRange.start).toStrictEqual(30);

    service.handleExternalChange({
      revision: 2,
      changeset: cs('external before - ', [0, 5], ' - external after'),
    });

    expect(service.client.server.toString()).toStrictEqual(
      cs('external before - server - external after').toString()
    );
    expect(service.client.submitted.toString()).toStrictEqual(
      cs([0, 23], '; submitted', [24, 40]).toString()
    );
    expect(service.client.local.toString()).toStrictEqual(
      cs([0, 34], '; local; more', [35, 51]).toString()
    );
    expect(service.client.view.toString()).toStrictEqual(
      cs('external before - server; submitted; local; more - external after').toString()
    );
    expect(service.headRevision).toStrictEqual(2);
    expect(service.viewText).toStrictEqual(
      'external before - server; submitted; local; more - external after'
    );
    expect(selectionRange.start).toStrictEqual(48);
    expect(selectionRange.end).toStrictEqual(48);

    service.undo();
    expect(service.viewText).toStrictEqual(
      'external before - server; submitted; local - external after'
    );
    expect(selectionRange.start).toStrictEqual(42);
    expect(selectionRange.end).toStrictEqual(42);

    service.undo();
    expect(service.viewText).toStrictEqual(
      'external before - server; submitted - external after'
    );
    expect(selectionRange.start).toStrictEqual(35);
    expect(selectionRange.end).toStrictEqual(35);

    service.undo();
    expect(service.viewText).toStrictEqual('external before - server - external after');
    expect(selectionRange.start).toStrictEqual(24);
    expect(selectionRange.end).toStrictEqual(24);
  });
});

describe('insertText', () => {
  it('inserts "hello world"', () => {
    const service = new CollabService();
    const plainText = new SimpleTextEditor(service);
    const { selectionRange } = newSelectionRange(service);
    plainText.insert('hello world', selectionRange);
    expect(service.viewText).toStrictEqual('hello world');
  });

  it('inserts between existing', () => {
    const service = new CollabService();
    const plainText = new SimpleTextEditor(service);
    const { selectionRange } = newSelectionRange(service);
    plainText.insert('hello world', selectionRange);
    selectionRange.set(5);
    plainText.insert(' between', selectionRange);
    expect(service.viewText).toStrictEqual('hello between world');
  });
});
