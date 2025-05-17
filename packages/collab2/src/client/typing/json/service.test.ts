import { assert, describe, expect, it, vi } from 'vitest';

import { CollabService, spaceNewlineHook } from '../..';

import { Changeset, InsertStrip } from '../../../common/changeset';
import { Selection } from '../../../common/selection';

import { Service } from './service';
import { TextParser } from './text-parser';

describe('one field', () => {
  it('keeps insert within bounds', () => {
    const collabService = new CollabService();

    const fieldNames = ['c'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        keys: fieldNames,
        fallbackKey: fieldNames[0],
      }),
      collabService,
    });

    const field = jsonService.getTyper('c');

    expect(collabService.viewText).toStrictEqual('{"c":""}');

    field.insert('foo', Selection.create(0));
    expect(collabService.viewText).toStrictEqual('{"c":"foo"}');
    expect(field.value).toStrictEqual('foo');

    field.insert('bar', Selection.create(5000, 10000));
    expect(collabService.viewText).toStrictEqual('{"c":"foobar"}');
    expect(field.value).toStrictEqual('foobar');

    field.insert('d', Selection.create(-10000, 10000));
    expect(collabService.viewText).toStrictEqual('{"c":"d"}');
    expect(field.value).toStrictEqual('d');
  });

  it('keeps delete within bounds', () => {
    const collabService = new CollabService();

    const fieldNames = ['c'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        keys: fieldNames,
        fallbackKey: fieldNames[0],
      }),
      collabService,
    });

    collabService.addLocalTyping({
      history: 'no',
      changeset: Changeset.create(collabService.viewText.length, [
        InsertStrip.create('{"c":"d"}'),
      ]),
      selection: Selection.ZERO,
    });
    expect(collabService.viewText).toStrictEqual('{"c":"d"}');

    const field = jsonService.getTyper('c');

    field.delete(100, Selection.create(-10000, 10000));
    expect(collabService.viewText).toStrictEqual('{"c":""}');
    expect(field.value).toStrictEqual('');
  });

  it('leaves unknown properties unmodified', () => {
    const collabService = new CollabService();

    const fieldNames = ['c'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        keys: fieldNames,
        fallbackKey: fieldNames[0],
      }),
      collabService,
    });
    expect(collabService.viewText).toStrictEqual('{"c":""}');

    collabService.addLocalTyping({
      history: 'no',
      changeset: Changeset.create(collabService.viewText.length, [
        InsertStrip.create('{"c":"d", "ignore": 5}'),
      ]),
      selection: Selection.ZERO,
    });
    expect(collabService.viewText).toStrictEqual('{"c":"d","ignore":5}');

    const field = jsonService.getTyper('c');

    field.insert('a', Selection.create(1));
    expect(collabService.viewText).toStrictEqual('{"c":"da","ignore":5}');
  });

  it('stringifes inserted text', () => {
    const collabService = new CollabService();

    const fieldNames = ['c'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        hook: spaceNewlineHook,
        keys: fieldNames,
        fallbackKey: fieldNames[0],
      }),
      collabService,
    });

    const field = jsonService.getTyper('c');

    field.insert('\n', Selection.ZERO);

    expect(collabService.viewText).toMatchInlineSnapshot(`"{"c":"\\n "}"`);
    expect(field.value).toMatchInlineSnapshot(`
      "
      "
    `);
  });

  it('inserts json with escaped characters', () => {
    const collabService = new CollabService();

    const fieldNames = ['c'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        hook: spaceNewlineHook,
        keys: fieldNames,
        fallbackKey: fieldNames[0],
      }),
      collabService,
    });

    collabService.addLocalTyping({
      changeset: Changeset.create(collabService.viewText.length, [
        InsertStrip.create(JSON.stringify('start\n\n[sel\n\nected]\n\nend')),
      ]),
      selection: Selection.ZERO,
    });

    const field = jsonService.getTyper('c');

    field.insert('r\neplaced', Selection.create(7, 19));
    expect(field.value).toStrictEqual('start\n\nr\neplaced\n\nend');
    expect(collabService.viewText).toMatchInlineSnapshot(
      `"{"c":"start\\n \\n r\\n eplaced\\n \\n end"}"`
    );
  });

  it('deletes json with escaped characters', () => {
    const collabService = new CollabService();

    const fieldNames = ['c'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        hook: spaceNewlineHook,
        keys: fieldNames,
        fallbackKey: fieldNames[0],
      }),
      collabService,
    });

    collabService.addLocalTyping({
      changeset: Changeset.create(collabService.viewText.length, [
        InsertStrip.create(JSON.stringify('\n\nstart\n\n[sel\n\nected]\n\nend')),
      ]),
      selection: Selection.ZERO,
    });

    const field = jsonService.getTyper('c');
    field.delete(2, Selection.create(9, 21));

    expect(field.value).toStrictEqual('\n\nstart\n\n\nend');
    expect(collabService.viewText).toMatchInlineSnapshot(
      `"{"c":"\\n \\n start\\n \\n \\n end"}"`
    );
  });

  it('emits external change json with escaped characters', () => {
    const collabService = new CollabService();

    const fieldNames = ['c'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        hook: spaceNewlineHook,
        keys: fieldNames,
        fallbackKey: fieldNames[0],
      }),
      collabService,
    });

    const submittedRecord = collabService.submitChanges();
    if (submittedRecord) {
      collabService.submittedChangesAcknowledged({
        ...submittedRecord,
        revision: submittedRecord.targetRevision + 1,
      });
    }

    const field = jsonService.getTyper('c');

    const fieldEventsSpy = vi.fn();
    field.on('*', ({ type, event: { typer, ...rest } }) => {
      fieldEventsSpy(type, rest);
    });

    field.insert('\n', Selection.ZERO);

    const submittedRecord2 = collabService.submitChanges();
    assert(submittedRecord2 != null);
    collabService.submittedChangesAcknowledged({
      ...submittedRecord2,
      revision: submittedRecord2.targetRevision + 1,
    });

    collabService.addExternalTyping({
      authorId: '',
      changeset: Changeset.parse('11:0-8,"a",9-10'),
      revision: collabService.serverRevision + 1,
      selectionInverse: Selection.ZERO,
      selection: Selection.ZERO,
    });

    expect(collabService.viewText).toMatchInlineSnapshot(`"{"c":"\\n a"}"`);
    expect(field.value).toMatchInlineSnapshot(`
      "
      a"
    `);

    expect(fieldEventsSpy.mock.calls).toStrictEqual([
      ['selection:changed', { newSelection: Selection.create(1), source: 'typing' }],
      ['value:changed', { newValue: '\n' }],
      [
        'externalTyping:applied',
        {
          changeset: Changeset.parse('1:0,"a"'),
        },
      ],
      ['value:changed', { newValue: '\na' }],
    ]);
  });

  it('emits external change json with escaped characters 2', () => {
    const collabService = new CollabService();

    const fieldNames = ['c'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        hook: spaceNewlineHook,
        keys: fieldNames,
        fallbackKey: fieldNames[0],
      }),
      collabService,
    });

    const submittedRecord = collabService.submitChanges();
    if (submittedRecord) {
      collabService.submittedChangesAcknowledged({
        ...submittedRecord,
        revision: collabService.serverRevision + 1,
      });
    }

    const field = jsonService.getTyper('c');

    const fieldEventsSpy = vi.fn();
    field.on('*', ({ type, event: { typer, ...rest } }) => {
      fieldEventsSpy(type, rest);
    });
    field.insert('\n\n', Selection.ZERO);

    const submittedRecord2 = collabService.submitChanges();
    assert(submittedRecord2 != null);
    collabService.submittedChangesAcknowledged({
      ...submittedRecord2,
      revision: collabService.serverRevision + 1,
    });

    collabService.addExternalTyping({
      authorId: '',
      changeset: Changeset.parse('14:0-11,"a\\\\n b",12-13'),
      revision: collabService.serverRevision + 1,
      selectionInverse: Selection.ZERO,
      selection: Selection.ZERO,
    });

    expect(collabService.viewText).toMatchInlineSnapshot(`"{"c":"\\n \\n a\\n b"}"`);
    expect(field.value).toMatchInlineSnapshot(`
      "

      a
      b"
    `);

    expect(fieldEventsSpy.mock.calls).toStrictEqual([
      ['selection:changed', { newSelection: Selection.create(2), source: 'typing' }],
      ['value:changed', { newValue: '\n\n' }],
      [
        'externalTyping:applied',
        {
          changeset: Changeset.parse('2:0-1,"a\\nb"'),
        },
      ],
      ['value:changed', { newValue: '\n\na\nb' }],
    ]);
  });

  it('redo deleted text selection is parsed', () => {
    const collabService = new CollabService();

    const fieldNames = ['c'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        hook: spaceNewlineHook,
        keys: fieldNames,
        fallbackKey: fieldNames[0],
      }),
      collabService,
    });

    const submittedRecord = collabService.submitChanges();
    if (submittedRecord) {
      collabService.submittedChangesAcknowledged({
        ...submittedRecord,
        revision: collabService.serverRevision + 1,
      });
    }

    const field = jsonService.getTyper('c');

    field.insert('\n\n', Selection.ZERO);

    field.insert('dkflag\n', Selection.create(0));

    field.delete(1, Selection.create(1));

    collabService.undo();

    expect(field.value).toMatchInlineSnapshot(`
      "dkflag


      "
    `);
  });
});

describe('two fields', () => {
  it('inserts to content', () => {
    const collabService = new CollabService();

    const fieldNames = ['t', 'c'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        keys: fieldNames,
        fallbackKey: fieldNames[1],
      }),
      collabService,
    });

    const field = jsonService.getTyper('c');
    field.insert('foo', Selection.ZERO);

    expect(collabService.viewText).toStrictEqual('{"c":"foo","t":""}');
    expect(field.value).toStrictEqual('foo');
  });

  it('inserts to title', () => {
    const collabService = new CollabService();

    const fieldNames = ['t', 'c'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        keys: fieldNames,
        fallbackKey: fieldNames[1],
      }),
      collabService,
    });

    const field = jsonService.getTyper('t');

    field.insert('bar', Selection.ZERO);

    expect(collabService.viewText).toStrictEqual('{"c":"","t":"bar"}');
    expect(field.value).toStrictEqual('bar');
  });

  it('adjusts to changing collabService viewText', () => {
    const collabService = new CollabService();

    const fieldNames = ['t', 'c'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        keys: fieldNames,
        fallbackKey: fieldNames[1],
      }),
      collabService,
    });

    const title = jsonService.getTyper('t');
    const content = jsonService.getTyper('c');

    content.insert('foo', Selection.ZERO);
    title.insert('bar', Selection.ZERO);
    expect(collabService.viewText).toStrictEqual('{"c":"foo","t":"bar"}');

    collabService.addLocalTyping({
      history: 'no',
      changeset: Changeset.create(collabService.viewText.length, [
        InsertStrip.create('{"t":"title","c":"content"}'),
      ]),
      selection: Selection.ZERO,
    });
    expect(content.value).toStrictEqual('content');
    expect(title.value).toStrictEqual('title');

    title.insert('t', Selection.create(1, 2));
    collabService.addLocalTyping({
      history: 'no',
      changeset: Changeset.create(collabService.viewText.length, [
        InsertStrip.create('{"t":"tttle","c":"content"}'),
      ]),
      selection: Selection.ZERO,
    });
  });

  it('invalid viewText plain text => copied to fallback key', () => {
    const collabService = new CollabService();

    const fieldNames = ['t', 'c'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        keys: fieldNames,
        fallbackKey: fieldNames[1],
      }),
      collabService,
    });

    const title = jsonService.getTyper('t');
    const content = jsonService.getTyper('c');

    collabService.addLocalTyping({
      history: 'no',
      changeset: Changeset.create(collabService.viewText.length, [
        InsertStrip.create('oops messed up format'),
      ]),
      selection: Selection.ZERO,
    });
    expect(content.value).toStrictEqual('oops messed up format');
    expect(title.value).toStrictEqual('');
  });

  it('invalid json copied to fallback key', () => {
    const collabService = new CollabService();

    const fieldNames = ['t', 'c'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        keys: fieldNames,
        fallbackKey: fieldNames[1],
      }),
      collabService,
    });

    const title = jsonService.getTyper('t');
    collabService.addLocalTyping({
      history: 'no',
      changeset: Changeset.create(collabService.viewText.length, [
        InsertStrip.create('{c:"val"}'),
      ]),
      selection: Selection.ZERO,
    });
    title.insert('ok', Selection.ZERO);
    expect(collabService.viewText).toStrictEqual('{"c":"{c:\\"val\\"}","t":"ok"}');
  });

  it('emits correct events', () => {
    const collabService = new CollabService();

    const fieldNames = ['t', 'c'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        keys: fieldNames,
        fallbackKey: fieldNames[1],
      }),
      collabService,
    });

    const title = jsonService.getTyper('t');
    const content = jsonService.getTyper('c');

    const titleEventsSpy = vi.fn();
    title.on('*', ({ type, event: { typer, ...rest } }) => {
      titleEventsSpy(type, rest);
    });

    const contentEventsSpy = vi.fn();
    content.on('*', ({ type, event: { typer, ...rest } }) => {
      contentEventsSpy(type, rest);
    });

    let submittedRecord = collabService.submitChanges();
    assert(submittedRecord != null);
    collabService.submittedChangesAcknowledged({
      ...submittedRecord,
      revision: collabService.serverRevision + 1,
    });

    content.insert('hi', Selection.ZERO);

    collabService.addExternalTyping({
      authorId: '',
      changeset: Changeset.parse('15:0-12,"hello",13-14'),
      revision: collabService.serverRevision + 1,
      selectionInverse: Selection.ZERO,
      selection: Selection.ZERO,
    });

    content.insert('END', Selection.create(100));
    content.insert('a', Selection.ZERO);

    collabService.addExternalTyping({
      authorId: '',
      changeset: Changeset.parse('20:0-17,"A",18-19'),
      revision: collabService.serverRevision + 1,
      selectionInverse: Selection.ZERO,
      selection: Selection.ZERO,
    });

    collabService.addExternalTyping({
      authorId: '',
      changeset: Changeset.parse('21:"DEL"'),
      revision: collabService.serverRevision + 1,
      selectionInverse: Selection.ZERO,
      selection: Selection.ZERO,
    });

    submittedRecord = collabService.submitChanges();
    if (submittedRecord) {
      collabService.submittedChangesAcknowledged({
        ...submittedRecord,
        revision: collabService.serverRevision + 1,
      });
    }

    collabService.addExternalTyping({
      authorId: '',
      changeset: Changeset.parse('24:0-14,"_OK",15-23'),
      revision: collabService.serverRevision + 1,
      selectionInverse: Selection.ZERO,
      selection: Selection.ZERO,
    });

    expect(titleEventsSpy.mock.calls).toStrictEqual([
      ['externalTyping:applied', { changeset: Changeset.parse('0:"hello"') }],
      ['value:changed', { newValue: 'hello' }],
      ['externalTyping:applied', { changeset: Changeset.parse('5:0-4,"A"') }],
      ['value:changed', { newValue: 'helloA' }],
      ['value:changed', { newValue: '' }],
    ]);

    expect(contentEventsSpy.mock.calls).toStrictEqual([
      [
        'selection:changed',
        {
          newSelection: Selection.create(2),
          source: 'typing',
        },
      ],
      ['value:changed', { newValue: 'hi' }],
      [
        'selection:changed',
        {
          newSelection: Selection.create(5),
          source: 'typing',
        },
      ],
      ['value:changed', { newValue: 'hiEND' }],
      [
        'selection:changed',
        {
          newSelection: Selection.create(1),
          source: 'typing',
        },
      ],
      ['value:changed', { newValue: 'ahiEND' }],
      ['value:changed', { newValue: 'DELahiEND' }],
      ['externalTyping:applied', { changeset: Changeset.parse('9:0-8,"_OK"') }],
      ['value:changed', { newValue: 'DELahiEND_OK' }],
    ]);
  });

  it('emits correct events 2', () => {
    const collabService = new CollabService();

    const fieldNames = ['t', 'c'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        keys: fieldNames,
        fallbackKey: fieldNames[1],
      }),
      collabService,
    });

    const title = jsonService.getTyper('t');
    const content = jsonService.getTyper('c');

    const titleEventsSpy = vi.fn();
    title.on('*', ({ type, event: { typer, ...rest } }) => {
      titleEventsSpy(type, rest);
    });

    const contentEventsSpy = vi.fn();
    content.on('*', ({ type, event: { typer, ...rest } }) => {
      contentEventsSpy(type, rest);
    });

    let submittedRecord = collabService.submitChanges();
    assert(submittedRecord != null);
    collabService.submittedChangesAcknowledged({
      ...submittedRecord,
      revision: collabService.serverRevision + 1,
    });

    content.insert('hi', Selection.ZERO);

    collabService.addExternalTyping({
      authorId: '',
      changeset: Changeset.parse('15:0-12,"hello",13-14'),
      revision: collabService.serverRevision + 1,
      selectionInverse: Selection.ZERO,
      selection: Selection.ZERO,
    });

    content.insert('END', Selection.create(100));
    content.insert('a', Selection.ZERO);

    collabService.addExternalTyping({
      authorId: '',
      changeset: Changeset.parse('20:0-17,"A",18-19'),
      revision: collabService.serverRevision + 1,
      selectionInverse: Selection.ZERO,
      selection: Selection.ZERO,
    });

    collabService.addExternalTyping({
      authorId: '',
      changeset: Changeset.parse('21:"DEL"'),
      revision: collabService.serverRevision + 1,
      selectionInverse: Selection.ZERO,
      selection: Selection.ZERO,
    });

    submittedRecord = collabService.submitChanges();
    if (submittedRecord) {
      collabService.submittedChangesAcknowledged({
        ...submittedRecord,
        revision: collabService.serverRevision + 1,
      });
    }

    collabService.addExternalTyping({
      authorId: '',
      changeset: Changeset.parse('27:0-17,"!",18-26'),
      revision: 7,
      selectionInverse: Selection.ZERO,
      selection: Selection.ZERO,
    });

    collabService.addExternalTyping({
      authorId: '',
      changeset: Changeset.parse('24:0-14,"_OK",15-23'),
      revision: 6,
      selectionInverse: Selection.ZERO,
      selection: Selection.ZERO,
    });

    expect(titleEventsSpy.mock.calls).toStrictEqual([
      ['externalTyping:applied', { changeset: Changeset.parse('0:"hello"') }],
      ['value:changed', { newValue: 'hello' }],
      ['externalTyping:applied', { changeset: Changeset.parse('5:0-4,"A"') }],
      ['value:changed', { newValue: 'helloA' }],
      ['value:changed', { newValue: '' }],
    ]);

    expect(contentEventsSpy.mock.calls).toStrictEqual([
      [
        'selection:changed',
        {
          newSelection: Selection.create(2),
          source: 'typing',
        },
      ],
      ['value:changed', { newValue: 'hi' }],
      [
        'selection:changed',
        {
          newSelection: Selection.create(5),
          source: 'typing',
        },
      ],
      ['value:changed', { newValue: 'hiEND' }],
      [
        'selection:changed',
        {
          newSelection: Selection.create(1),
          source: 'typing',
        },
      ],
      ['value:changed', { newValue: 'ahiEND' }],
      ['value:changed', { newValue: 'DELahiEND' }],
      ['externalTyping:applied', { changeset: Changeset.parse('9:0-8,"_OK"') }],
      ['externalTyping:applied', { changeset: Changeset.parse('12:0-11,"!"') }],
      ['value:changed', { newValue: 'DELahiEND_OK' }],
      ['value:changed', { newValue: 'DELahiEND_OK!' }],
    ]);
  });

  it('emits correct externalTyping:applied with retained newline character', () => {
    const collabService = new CollabService();

    const fieldNames = ['CONTENT', 'TITLE'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        hook: spaceNewlineHook,
        keys: fieldNames,
        fallbackKey: fieldNames[0],
      }),
      collabService,
    });

    const content = jsonService.getTyper('CONTENT');

    const contentEventsSpy = vi.fn();
    content.on('*', ({ type, event: { typer, ...rest } }) => {
      contentEventsSpy(type, rest);
    });

    collabService.reset({
      revision: 1,
      text: Changeset.fromText('{"CONTENT":"\\n abc","TITLE":""}'),
    });

    expect(content.value).toStrictEqual('\nabc');

    collabService.addExternalTyping({
      authorId: '',
      changeset: Changeset.parse('31:0-14,"A",15-30'),
      revision: collabService.serverRevision + 1,
      selectionInverse: Selection.ZERO,
      selection: Selection.ZERO,
    });

    expect(contentEventsSpy.mock.calls).toStrictEqual([
      ['externalTyping:applied', { changeset: Changeset.parse('4:0,"A",1-3') }],
      [
        'value:changed',
        {
          newValue: '\nAabc',
        },
      ],
    ]);
  });

  it('emits correct externalTyping:applied with retained more newline characters', () => {
    const collabService = new CollabService();

    const fieldNames = ['CONTENT', 'TITLE'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        hook: spaceNewlineHook,
        keys: fieldNames,
        fallbackKey: fieldNames[0],
      }),
      collabService,
    });

    const content = jsonService.getTyper('CONTENT');

    const contentEventsSpy = vi.fn();
    content.on('*', ({ type, event: { typer, ...rest } }) => {
      contentEventsSpy(type, rest);
    });

    collabService.reset({
      revision: 1,
      text: Changeset.fromText('{"CONTENT":"\\n \\n a\\n bc","TITLE":""}'),
    });

    expect(content.value).toStrictEqual('\n\na\nbc');

    collabService.addExternalTyping({
      authorId: '',
      changeset: Changeset.parse('37:0-17,"A",18-21,"B",22-36'),
      revision: collabService.serverRevision + 1,
      selectionInverse: Selection.ZERO,
      selection: Selection.ZERO,
    });

    expect(contentEventsSpy.mock.calls).toStrictEqual([
      ['externalTyping:applied', { changeset: Changeset.parse('6:0-1,"A",2-3,"B",4-5') }],
      [
        'value:changed',
        {
          newValue: '\n\nAa\nBbc',
        },
      ],
    ]);
  });

  it('emits correct externalTyping:applied when deleting newline character', () => {
    const collabService = new CollabService();

    const fieldNames = ['CONTENT', 'TITLE'] as const;
    const jsonService = new Service({
      fieldNames,
      parser: new TextParser({
        hook: spaceNewlineHook,
        keys: fieldNames,
        fallbackKey: fieldNames[0],
      }),
      collabService,
    });

    const content = jsonService.getTyper('CONTENT');

    const contentEventsSpy = vi.fn();
    content.on('*', ({ type, event: { typer, ...rest } }) => {
      contentEventsSpy(type, rest);
    });

    collabService.reset({
      revision: 1,
      text: Changeset.fromText('{"CONTENT":"\\n \\n abc\\n ","TITLE":""}'),
    });

    expect(content.value).toStrictEqual('\n\nabc\n');

    collabService.addExternalTyping({
      authorId: '',
      changeset: Changeset.parse('37:0-11,15-36'),
      revision: collabService.serverRevision + 1,
      selectionInverse: Selection.ZERO,
      selection: Selection.ZERO,
    });

    expect(contentEventsSpy.mock.calls).toStrictEqual([
      ['externalTyping:applied', { changeset: Changeset.parse('6:1-5') }],
      [
        'value:changed',
        {
          newValue: '\nabc\n',
        },
      ],
    ]);
  });
});
