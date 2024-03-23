import { describe, it, expect, beforeEach, vi } from 'vitest';

import { Changeset } from '../changeset/changeset';
import { ChangesetEditor } from '../editor/changeset-editor';
import { SelectionRange } from '../editor/selection-range';
import { textWithSelection } from '../test/helpers/text-with-selection';

import { ChangeSource, DocumentClient, Events } from './document-client';

const cs = (...values: unknown[]) => Changeset.parseValue(values);

describe('DocumentClient', () => {
  describe('constructor', () => {
    it('initializes state with server changeset', () => {
      const serverChangeset = cs('server document');

      const client = new DocumentClient({ initialServerChangeset: serverChangeset });
      expect(client.server.toString()).toStrictEqual(serverChangeset.toString());
      expect(client.submitted.toString()).toStrictEqual(
        serverChangeset.getIdentity().toString()
      );
      expect(client.local.toString()).toStrictEqual(
        serverChangeset.getIdentity().toString()
      );
      expect(client.view.toString()).toStrictEqual(serverChangeset.toString());
    });
  });

  describe('composeLocalChange', () => {
    const serverChangeset = cs('server document');
    let client: DocumentClient;

    beforeEach(() => {
      client = new DocumentClient({ initialServerChangeset: serverChangeset });
    });

    it('updates view with the change', () => {
      const changeA = cs([0, 5], '[A]', [6, 14]);
      const changeB = cs([0, 8], '[B]', [9, 17]);

      client.composeLocalChange(changeA);
      expect(client.view.toString()).toStrictEqual(cs('server[A] document').toString());
      client.composeLocalChange(changeB);
      expect(client.view.toString()).toStrictEqual(
        cs('server[A][B] document').toString()
      );
    });

    it('composes local with change', () => {
      const changeA = cs([0, 5], '[A]', [6, 14]);
      const changeB = cs([0, 8], '[B]', [9, 17]);

      client.composeLocalChange(changeA);
      expect(client.local.toString()).toStrictEqual(
        cs([0, 5], '[A]', [6, 14]).toString()
      );

      client.composeLocalChange(changeB);
      expect(client.local.toString()).toStrictEqual(
        cs([0, 5], '[A][B]', [6, 14]).toString()
      );
    });

    it('replaces redundant insertions with retained characters', () => {
      const redundantChange = cs('server', [6, 14]);

      client.composeLocalChange(redundantChange);
      expect(client.local.toString()).toStrictEqual(
        client.server.getIdentity().toString()
      );
    });

    it('emits viewChanged', () => {
      const change = cs([0, 5], '[A]', [6, 14]);

      const emit = vi.spyOn(client.eventBus, 'emit');
      client.composeLocalChange(change);
      expect(emit).toBeCalledWith('viewChanged', {
        view: client.view,
        change,
        source: ChangeSource.Local,
      });
    });

    it.each([
      {
        desc: 'sets matching insertion to retained',
        server: ['[server]'],
        submitted: [[0, 7], '[submitted]'],
        initialLocal: [[0, 18], '[local]'],
        nextLocal: ['[server]', [8, 18], '[local]'],
        expected: {
          local: [[0, 18], '[local]'],
          view: ['[server][submitted][local]'],
        },
      },
    ])('$desc', ({ server, submitted, initialLocal, nextLocal, expected }) => {
      client.composeLocalChange(cs(...server));
      client.submitChanges();
      client.submittedChangesAcknowledged();
      client.composeLocalChange(cs(...submitted));
      client.submitChanges();
      client.composeLocalChange(cs(...initialLocal));
      client.composeLocalChange(cs(...nextLocal));

      expect(client.local.toString()).toStrictEqual(cs(...expected.local).toString());
      expect(client.view.toString()).toStrictEqual(cs(...expected.view).toString());
    });
  });

  describe('haveSubmittedChanges', () => {
    it('checks if submitted is not identity for server', () => {
      const client = new DocumentClient({ initialServerChangeset: cs('server') });
      const isIdentity = vi.spyOn(client.submitted, 'isIdentity');
      client.haveSubmittedChanges();
      expect(isIdentity).toHaveBeenCalledWith(client.server);
    });
  });

  describe('haveLocalChanges', () => {
    it('checks if local is not identity for submitted', () => {
      const client = new DocumentClient({ initialServerChangeset: cs('server') });
      client.composeLocalChange(cs('hi'));
      const isIdentity = vi.spyOn(client.local, 'isIdentity');
      client.haveLocalChanges();
      expect(isIdentity).toHaveBeenCalledWith(client.submitted);
    });
  });

  describe('canSubmitChanges', () => {
    it('returns true only if have local changes and dont have submitted changes', () => {
      const client = new DocumentClient({ initialServerChangeset: cs('server') });

      const haveSubmittedChangesFn = vi.spyOn(client, 'haveSubmittedChanges');
      const haveLocalChangesFn = vi.spyOn(client, 'haveLocalChanges');

      haveSubmittedChangesFn.mockReturnValueOnce(true);
      haveLocalChangesFn.mockReturnValueOnce(true);
      expect(client.canSubmitChanges()).toBeFalsy();

      haveSubmittedChangesFn.mockReturnValueOnce(true);
      haveLocalChangesFn.mockReturnValueOnce(false);
      expect(client.canSubmitChanges()).toBeFalsy();

      haveSubmittedChangesFn.mockReturnValueOnce(false);
      haveLocalChangesFn.mockReturnValueOnce(true);
      expect(client.canSubmitChanges()).toBeTruthy();

      haveSubmittedChangesFn.mockReturnValueOnce(false);
      haveLocalChangesFn.mockReturnValueOnce(false);
      expect(client.canSubmitChanges()).toBeFalsy();
    });
  });

  describe('submitChanges', () => {
    it('submits only if have local changes and no submitted changes', () => {
      const client = new DocumentClient({ initialServerChangeset: cs('server') });
      const haveSubmittedChanges = vi.spyOn(client, 'haveSubmittedChanges');
      const haveLocalChanges = vi.spyOn(client, 'haveLocalChanges');

      haveSubmittedChanges.mockReturnValueOnce(true);
      haveLocalChanges.mockReturnValueOnce(true);
      expect(client.submitChanges()).toStrictEqual(false);

      haveSubmittedChanges.mockReturnValueOnce(true);
      haveLocalChanges.mockReturnValueOnce(false);
      expect(client.submitChanges()).toStrictEqual(false);

      haveSubmittedChanges.mockReturnValueOnce(false);
      haveLocalChanges.mockReturnValueOnce(true);
      expect(client.submitChanges()).toStrictEqual(true);

      haveSubmittedChanges.mockReturnValueOnce(false);
      haveLocalChanges.mockReturnValueOnce(false);
      expect(client.submitChanges()).toStrictEqual(false);
    });

    it('sets submitted = local and local = identity', () => {
      const client = new DocumentClient({ initialServerChangeset: cs('server') });

      client.composeLocalChange(cs('hi'));
      client.submitChanges();
      expect(client.submitted.toString()).toStrictEqual(cs('hi').toString());
      expect(client.local.toString()).toStrictEqual(cs('hi').getIdentity().toString());
    });
  });

  describe('submittedChangesAcknowledged', () => {
    it('acknowlege only if have submitted changes', () => {
      const client = new DocumentClient({ initialServerChangeset: cs('server') });

      expect(client.submittedChangesAcknowledged()).toStrictEqual(false);

      client.composeLocalChange(cs([0, 5], ': submit this'));

      expect(client.submittedChangesAcknowledged()).toStrictEqual(false);

      client.submitChanges();

      expect(client.submittedChangesAcknowledged()).toStrictEqual(true);
    });

    it('sets composes submitted to server and sets submitted to identity', () => {
      const client = new DocumentClient({ initialServerChangeset: cs('server') });
      client.composeLocalChange(cs([0, 5], ': submit this'));
      client.submitChanges();
      client.submittedChangesAcknowledged();
      expect(client.server.toString()).toStrictEqual(
        cs('server: submit this').toString()
      );
      expect(client.submitted.toString()).toStrictEqual(
        client.server.getIdentity().toString()
      );
    });
  });

  describe('handleExternalChange', () => {
    let client: DocumentClient;

    beforeEach(() => {
      client = new DocumentClient();
    });

    it.each([
      {
        desc: 'inserts to the end',
        server: ['[server]'],
        submitted: [[0, 7], '[submitted]'],
        local: [[0, 18], '[local]'],
        external: [[0, 7], '[external]'],
        expected: {
          server: ['[server][external]'],
          submitted: [[0, 17], '[submitted]'],
          local: [[0, 28], '[local]'],
          view: ['[server][external][submitted][local]'],
        },
      },
      {
        desc: 'local and external deletion matches',
        server: ['delete following word: TEXT. keep this'],
        submitted: ['[start offset]', [0, 37]],
        local: [
          [0, 36],
          [39, 51],
        ],
        external: [
          [0, 22],
          [27, 37],
        ],
        expected: {
          server: ['delete following word: . keep this'],
          submitted: ['[start offset]', [0, 33]],
          local: [[0, 47]],
          view: ['[start offset]delete following word: . keep this'],
        },
      },
    ])('$desc', ({ server, submitted, local, external, expected }) => {
      client.composeLocalChange(cs(...server));
      client.submitChanges();
      client.submittedChangesAcknowledged();
      client.composeLocalChange(cs(...submitted));
      client.submitChanges();
      client.composeLocalChange(cs(...local));

      client.handleExternalChange(cs(...external));

      expect(client.server.toString()).toStrictEqual(cs(...expected.server).toString());
      expect(client.submitted.toString()).toStrictEqual(
        cs(...expected.submitted).toString()
      );
      expect(client.local.toString()).toStrictEqual(cs(...expected.local).toString());
      expect(client.view.toString()).toStrictEqual(cs(...expected.view).toString());
    });

    it('sets server initial value without any local changes', () => {
      const initial = cs('initial document text');

      client.handleExternalChange(initial);
      expect(client.server.toString()).toStrictEqual(initial.toString());
      expect(client.submitted.toString()).toStrictEqual(initial.getIdentity().toString());
      expect(client.local.toString()).toStrictEqual(initial.getIdentity().toString());
    });
  });

  describe('integration', () => {
    let textValue = '';
    let client: DocumentClient;
    const selection = new SelectionRange({
      getLength() {
        return textValue.length;
      },
    });
    const editor = new ChangesetEditor({
      getValue() {
        return textValue;
      },
      selection,
    });
    editor.eventBus.on('change', ({ changeset, selectionPos }) => {
      client.composeLocalChange(changeset);
      selection.setPosition(selectionPos);
    });

    function handleClientViewChanged({ view, change, source }: Events['viewChanged']) {
      textValue = view.strips.joinInsertions();

      // Position is set manually on local change, so update it only on external
      if (source === ChangeSource.External) {
        selection.setSelectionRange(
          change.followIndex(selection.start),
          change.followIndex(selection.end)
        );
      }
    }

    function textValueWithSelection() {
      return textWithSelection(textValue, selection);
    }

    beforeEach(() => {
      textValue = '';
      selection.setSelectionRange(0, 0);
      client = new DocumentClient();
      client.eventBus.on('viewChanged', handleClientViewChanged);
    });

    it('external changes to server are composed as retained characters in submitted and local', () => {
      editor.insert('server');
      client.submitChanges();
      client.submittedChangesAcknowledged();
      editor.insert('; submitted');
      client.submitChanges();
      editor.insert('; local');
      editor.insert('; more');
      client.handleExternalChange(cs('external before - ', [0, 5], ' - external after'));

      expect(client.server.toString()).toStrictEqual(
        cs('external before - server - external after').toString()
      );
      expect(client.submitted.toString()).toStrictEqual(
        cs([0, 23], '; submitted', [24, 40]).toString()
      );
      expect(client.local.toString()).toStrictEqual(
        cs([0, 34], '; local; more', [35, 51]).toString()
      );
      expect(client.view.toString()).toStrictEqual(
        cs('external before - server; submitted; local; more - external after').toString()
      );
      expect(textValueWithSelection()).toStrictEqual(
        'external before - server; submitted; local; more> - external after'
      );
    });

    it('edits e0 to e8 with duplicate external deletion', () => {
      editor.insert('[e0]');
      editor.insert('[e1]');
      editor.insert('[e2]');
      client.submitChanges();
      client.submittedChangesAcknowledged();
      editor.insert('[e3]');
      editor.insert('[e4]');
      editor.insert('[e5]');
      client.submitChanges();
      editor.insert('[e6]');
      editor.insert('[e7]');
      editor.insert('[e8]');
      selection.setPosition(4);
      editor.deleteCount(4);

      client.handleExternalChange(
        cs('[EXTERNAL]', [4, 7], '[BETWEEN]', [8, 11], '[EXTERNAL]')
      );

      client.submittedChangesAcknowledged();
      client.submitChanges();
      client.submittedChangesAcknowledged();

      client.handleExternalChange(cs([0, 30], '[somewhere]', [31, 60]));

      selection.setPosition(23);
      editor.deleteCount(9);

      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1]>[e2][e3][somewhere][e4][e5][e6][e7][e8][EXTERNAL]'
      );

      expect(client.local.toString()).toStrictEqual('(72 -> 63)[0 - 13, 23 - 71]');
      expect(client.submitted.toString()).toStrictEqual('(72 -> 72)[0 - 71]');
      expect(client.server.toString()).toStrictEqual(
        '(0 -> 72)["[EXTERNAL][e1][BETWEEN][e2][e3][somewhere][e4][e5][e6][e7][e8][EXTERNAL]"]'
      );
    });
  });
});
