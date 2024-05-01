import { describe, it, expect, beforeEach, vi } from 'vitest';

import { Changeset } from '../changeset/changeset';
import { textWithSelection } from '../test/helpers/text-with-selection';
import { CollabClient, CollabClientSelection } from './collab-client';
import { ChangesetWriter } from './changeset-writer';

const cs = (...values: unknown[]) => Changeset.parseValue(values);

describe('constructor', () => {
  it('initializes state with server changeset', () => {
    const serverChangeset = cs('server document');

    const client = new CollabClient({ server: serverChangeset });
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
  let client: CollabClient;

  beforeEach(() => {
    client = new CollabClient({ server: serverChangeset });
  });

  it('updates view with the change', () => {
    const changeA = cs([0, 5], '[A]', [6, 14]);
    const changeB = cs([0, 8], '[B]', [9, 17]);

    client.composeLocalChange(changeA);
    expect(client.view.toString()).toStrictEqual(cs('server[A] document').toString());
    client.composeLocalChange(changeB);
    expect(client.view.toString()).toStrictEqual(cs('server[A][B] document').toString());
  });

  it('composes local with change', () => {
    const changeA = cs([0, 5], '[A]', [6, 14]);
    const changeB = cs([0, 8], '[B]', [9, 17]);

    client.composeLocalChange(changeA);
    expect(client.local.toString()).toStrictEqual(cs([0, 5], '[A]', [6, 14]).toString());

    client.composeLocalChange(changeB);
    expect(client.local.toString()).toStrictEqual(
      cs([0, 5], '[A][B]', [6, 14]).toString()
    );
  });

  it('replaces redundant insertions with retained characters', () => {
    const redundantChange = cs('server', [6, 14]);

    client.composeLocalChange(redundantChange);
    expect(client.local.toString()).toStrictEqual(client.server.getIdentity().toString());
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
    const client = new CollabClient({ server: cs('server') });
    const isIdentity = vi.spyOn(client.submitted, 'isIdentity');
    client.haveSubmittedChanges();
    expect(isIdentity).toHaveBeenCalledWith(client.server);
  });
});

describe('haveLocalChanges', () => {
  it('checks if local is not identity for submitted', () => {
    const client = new CollabClient({ server: cs('server') });
    client.composeLocalChange(cs('hi'));
    const isIdentity = vi.spyOn(client.local, 'isIdentity');
    client.haveLocalChanges();
    expect(isIdentity).toHaveBeenCalledWith(client.submitted);
  });
});

describe('canSubmitChanges', () => {
  it('returns true only if have local changes and dont have submitted changes', () => {
    const client = new CollabClient({ server: cs('server') });

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
    const client = new CollabClient({ server: cs('server') });
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
    const client = new CollabClient({ server: cs('server') });

    client.composeLocalChange(cs('hi'));
    client.submitChanges();
    expect(client.submitted.toString()).toStrictEqual(cs('hi').toString());
    expect(client.local.toString()).toStrictEqual(cs('hi').getIdentity().toString());
  });
});

describe('submittedChangesAcknowledged', () => {
  it('acknowlege only if have submitted changes', () => {
    const client = new CollabClient({ server: cs('server') });

    expect(client.submittedChangesAcknowledged()).toStrictEqual(false);

    client.composeLocalChange(cs([0, 5], ': submit this'));

    expect(client.submittedChangesAcknowledged()).toStrictEqual(false);

    client.submitChanges();

    expect(client.submittedChangesAcknowledged()).toStrictEqual(true);
  });

  it('sets composes submitted to server and sets submitted to identity', () => {
    const client = new CollabClient({ server: cs('server') });
    client.composeLocalChange(cs([0, 5], ': submit this'));
    client.submitChanges();
    client.submittedChangesAcknowledged();
    expect(client.server.toString()).toStrictEqual(cs('server: submit this').toString());
    expect(client.submitted.toString()).toStrictEqual(
      client.server.getIdentity().toString()
    );
  });
});

describe('handleExternalChange', () => {
  let client: CollabClient;

  beforeEach(() => {
    client = new CollabClient();
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
  let client: CollabClient;
  let selection: CollabClientSelection;
  let writer: ChangesetWriter;

  const helper = {
    insert(text: string) {
      const write = writer.insert(text);
      client.composeLocalChange(write.changeset);

      selection.local.set(write.newSelectionPos);
    },
    deleteCount(count: number) {
      const write = writer.deleteCount(count);
      if (!write) return;
      client.composeLocalChange(write.changeset);

      selection.local.set(write.newSelectionPos);
    },
    submitChanges() {
      selection.submitChanges();
    },
    submittedChangesAcknowledged() {
      selection.submittedChangesAcknowledged();
    },
    handleExternalChange(external: Changeset) {
      selection.handleExternalChange(external);
    },
  };

  function textValueWithSelection() {
    return textWithSelection(client.view.joinInsertions(), selection.local);
  }

  beforeEach(() => {
    client = new CollabClient();
    selection = new CollabClientSelection({
      client,
    });
    writer = new ChangesetWriter({
      getValue() {
        return client.view.joinInsertions();
      },
      selection: selection.local,
    });
  });

  it('external changes to server are composed as retained characters in submitted and local', () => {
    helper.insert('server');
    client.submitChanges();
    client.submittedChangesAcknowledged();
    helper.insert('; submitted');
    client.submitChanges();
    helper.insert('; local');
    helper.insert('; more');
    expect(textValueWithSelection()).toStrictEqual('server; submitted; local; more>');

    helper.handleExternalChange(cs('external before - ', [0, 5], ' - external after'));

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
    helper.insert('[e0]');
    helper.insert('[e1]');
    helper.insert('[e2]');
    client.submitChanges();
    client.submittedChangesAcknowledged();
    helper.insert('[e3]');
    helper.insert('[e4]');
    helper.insert('[e5]');
    client.submitChanges();
    helper.insert('[e6]');
    helper.insert('[e7]');
    helper.insert('[e8]');
    selection.local.set(4);
    helper.deleteCount(4);

    helper.handleExternalChange(
      cs('[EXTERNAL]', [4, 7], '[BETWEEN]', [8, 11], '[EXTERNAL]')
    );

    client.submittedChangesAcknowledged();
    client.submitChanges();
    client.submittedChangesAcknowledged();

    helper.handleExternalChange(cs([0, 30], '[somewhere]', [31, 60]));

    selection.local.set(23);
    helper.deleteCount(9);

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
