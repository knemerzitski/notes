import { describe, it, expect, beforeEach, vi } from 'vitest';

import { Changeset } from '../changeset/changeset';

import { ChangeSource, CollabClient } from './collab-client';

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
