/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import mitt from 'mitt';
import { afterEach, assert, beforeEach, describe, expect, it, vi } from 'vitest';

import { Changeset, InsertStrip, RetainStrip } from '../../changeset';
import { CollabService } from '../../client/collab-service';

import { defineCreateJsonTextFromService } from './create-service-json-text';
import { JsonTextEvents } from './types';
import { createLogger } from '../../../../utils/src/logging';

function setServiceText(service: CollabService, value: string) {
  service.pushSelectionChangeset(
    {
      changeset: Changeset.fromInsertion(value),
      afterSelection: { start: 0, end: 0 },
    },
    {
      type: 'merge',
    }
  );
}

function processEventsCalls(calls: any[][]) {
  return calls
    .filter((call) => !['appliedRedo', 'appliedUndo'].includes(call[0].type))
    .map((call) => [call[0].type, call[0].event]);
}

describe('one text', () => {
  enum TextType {
    CONTENT = 'c',
  }

  const createMultiJsonTextByService = defineCreateJsonTextFromService<TextType>(
    Object.values(TextType)
  );

  let service: CollabService;
  let multiJsonText: ReturnType<typeof createMultiJsonTextByService>;

  beforeEach(() => {
    service = new CollabService();
    multiJsonText = createMultiJsonTextByService(service);
  });

  it('keeps insert within bounds', () => {
    const text = multiJsonText.getText(TextType.CONTENT);

    text.insert('foo', {
      start: 0,
      end: 0,
    });
    expect(service.viewText).toStrictEqual('{"c":"foo"}');
    expect(text.value).toStrictEqual('foo');

    text.insert('bar', {
      start: 5000,
      end: 10000,
    });
    expect(service.viewText).toStrictEqual('{"c":"foobar"}');
    expect(text.value).toStrictEqual('foobar');

    text.insert('d', {
      start: -10000,
      end: 10000,
    });
    expect(service.viewText).toStrictEqual('{"c":"d"}');
    expect(text.value).toStrictEqual('d');
  });

  it('keeps delete within bounds', () => {
    setServiceText(service, '{"c":"d"}');
    const text = multiJsonText.getText(TextType.CONTENT);

    text.delete(100, {
      start: -10000,
      end: 10000,
    });
    expect(service.viewText).toStrictEqual('{"c":""}');
    expect(text.value).toStrictEqual('');
  });

  it('leaves unknown properties unmodified', () => {
    setServiceText(service, '{"c":"d", "ignore": 5}');
    const text = multiJsonText.getText(TextType.CONTENT);
    text.insert('a', { start: 1, end: 1 });
    expect(service.viewText).toStrictEqual('{"c":"da","ignore":5}');
  });

  it('stringifes inserted text', () => {
    const text = multiJsonText.getText(TextType.CONTENT);

    text.insert('\n', {
      start: 0,
      end: 0,
    });

    expect(service.viewText).toMatchInlineSnapshot(`"{"c":"\\n "}"`);
    expect(text.value).toMatchInlineSnapshot(`
      "
      "
    `);
  });

  it('inserts json with escaped characters', () => {
    service.pushSelectionChangeset({
      changeset: Changeset.fromInsertion(
        JSON.stringify('start\n\n[sel\n\nected]\n\nend')
      ),
      afterSelection: {
        start: 0,
        end: 0,
      },
    });

    const text = multiJsonText.getText(TextType.CONTENT);

    text.insert('r\neplaced', {
      start: 7,
      end: 19,
    });
    expect(text.value).toStrictEqual('start\n\nr\neplaced\n\nend');
    expect(service.viewText).toMatchInlineSnapshot(
      `"{"c":"start\\n \\n r\\n eplaced\\n \\n end"}"`
    );
  });

  it('deletes json with escaped characters', () => {
    service.pushSelectionChangeset({
      changeset: Changeset.fromInsertion(
        JSON.stringify('\n\nstart\n\n[sel\n\nected]\n\nend')
      ),
      afterSelection: {
        start: 0,
        end: 0,
      },
    });

    const text = multiJsonText.getText(TextType.CONTENT);
    text.delete(2, {
      start: 9,
      end: 21,
    });

    expect(text.value).toStrictEqual('\n\nstart\n\n\nend');
    expect(service.viewText).toMatchInlineSnapshot(
      `"{"c":"\\n \\n start\\n \\n \\n end"}"`
    );
  });

  it('emits external change json with escaped characters', () => {
    if (service.submittedRecord) {
      service.submittedChangesAcknowledged({
        ...service.submitChanges()!,
        revision: service.headRevision + 1,
      });
    }

    const content = multiJsonText.getText(TextType.CONTENT);

    const contentEvents = vi.fn();
    content.eventBus.on('*', contentEvents);

    content.insert('\n', {
      start: 0,
      end: 0,
    });

    const record = service.submitChanges();
    assert(record != null);
    service.submittedChangesAcknowledged({
      ...record,
      revision: service.headRevision + 1,
    });

    service.handleExternalChange({
      changeset: Changeset.parseValue([[0, 8], 'a', [9, 10]]),
      revision: service.headRevision + 1,
    });

    expect(service.viewText).toMatchInlineSnapshot(`"{"c":"\\n a"}"`);
    expect(content.value).toMatchInlineSnapshot(`
      "
      a"
    `);

    expect(processEventsCalls(contentEvents.mock.calls)).toStrictEqual([
      ['valueChanged', '\n'],
      ['selectionChanged', { start: 1, end: 1 }],
      ['valueChanged', '\na'],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue([0, 'a']), revision: service.headRevision }],
      ],
    ]);
  });

  it('emits external change json with escaped characters 2', () => {
    if (service.submittedRecord) {
      service.submittedChangesAcknowledged({
        ...service.submitChanges()!,
        revision: service.headRevision + 1,
      });
    }

    const content = multiJsonText.getText(TextType.CONTENT);

    const contentEvents = vi.fn();
    content.eventBus.on('*', contentEvents);

    content.insert('\n\n', {
      start: 0,
      end: 0,
    });

    const record = service.submitChanges();
    assert(record != null);
    service.submittedChangesAcknowledged({
      ...record,
      revision: service.headRevision + 1,
    });

    service.handleExternalChange({
      changeset: Changeset.parseValue([[0, 11], 'a\\n b', [12, 13]]),
      revision: service.headRevision + 1,
    });

    expect(service.viewText).toMatchInlineSnapshot(`"{"c":"\\n \\n a\\n b"}"`);
    expect(content.value).toMatchInlineSnapshot(`
      "

      a
      b"
    `);

    expect(processEventsCalls(contentEvents.mock.calls)).toStrictEqual([
      ['valueChanged', '\n\n'],
      ['selectionChanged', { start: 2, end: 2 }],
      ['valueChanged', '\n\na\nb'],
      [
        'handledExternalChanges',
        [
          {
            changeset: Changeset.parseValue([[0, 1], 'a\nb']),
            revision: service.headRevision,
          },
        ],
      ],
    ]);
  });

  it('redo deleted text selection is parsed', () => {
    const content = multiJsonText.getText(TextType.CONTENT);

    content.insert('dkflag\n', {
      start: 0,
      end: 0,
    });

    content.delete(1, {
      start: 1,
      end: 1,
    });

    service.undo();
  });
});

describe('two texts', () => {
  enum TextType {
    CONTENT = 'c',
    TITLE = 't',
  }

  const eventBus = mitt<JsonTextEvents>();
  const errorSpy = vi.fn();
  eventBus.on('error', errorSpy);

  const createMultiJsonTextByService = defineCreateJsonTextFromService<TextType>(
    Object.values(TextType),
    {
      eventBus,
    }
  );

  let service: CollabService;
  let multiJsonText: ReturnType<typeof createMultiJsonTextByService>;

  beforeEach(() => {
    service = new CollabService({
      logger: createLogger('service', { format: 'object' }),
    });
    multiJsonText = createMultiJsonTextByService(service);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inserts content', () => {
    const text = multiJsonText.getText(TextType.CONTENT);
    text.insert('foo', {
      start: 0,
      end: 0,
    });

    expect(service.viewText).toStrictEqual('{"c":"foo","t":""}');
    expect(text.value).toStrictEqual('foo');

    expect(errorSpy).not.toHaveBeenCalledOnce();
  });

  it('inserts title', () => {
    const text = multiJsonText.getText(TextType.TITLE);

    text.insert('bar', {
      start: 0,
      end: 0,
    });

    expect(service.viewText).toStrictEqual('{"c":"","t":"bar"}');
    expect(text.value).toStrictEqual('bar');

    expect(errorSpy).not.toHaveBeenCalledOnce();
  });

  it('adjusts to changing service viewText', () => {
    const content = multiJsonText.getText(TextType.CONTENT);
    const title = multiJsonText.getText(TextType.TITLE);

    content.insert('foo', {
      start: 0,
      end: 0,
    });
    title.insert('bar', {
      start: 0,
      end: 0,
    });
    expect(service.viewText).toStrictEqual('{"c":"foo","t":"bar"}');

    setServiceText(service, '{"t":"title","c":"content"}');
    expect(content.value).toStrictEqual('content');
    expect(title.value).toStrictEqual('title');

    title.insert('t', {
      start: 1,
      end: 2,
    });
    setServiceText(service, '{"t":"tttle","c":"content"}');

    expect(errorSpy).not.toHaveBeenCalledOnce();
  });

  describe('invalid viewText structure', () => {
    it('plain text => moved to first key', () => {
      const content = multiJsonText.getText(TextType.CONTENT);
      const title = multiJsonText.getText(TextType.TITLE);
      setServiceText(service, 'oops messed up format');
      expect(content.value).toStrictEqual('oops messed up format');
      expect(title.value).toStrictEqual('');

      expect(errorSpy).toHaveBeenCalledOnce();
    });
    it('invalid json', () => {
      const title = multiJsonText.getText(TextType.TITLE);
      setServiceText(service, '{c:"val"}');
      title.insert('ok', { start: 0, end: 0 });
      expect(service.viewText).toStrictEqual('{"c":"{c:\\"val\\"}","t":"ok"}');

      expect(errorSpy).toHaveBeenCalledOnce();
    });
  });

  it('emits correct events', () => {
    const title = multiJsonText.getText(TextType.TITLE);
    const content = multiJsonText.getText(TextType.CONTENT);

    const contentEvents = vi.fn();
    content.eventBus.on('*', contentEvents);

    const titleEvents = vi.fn();
    title.eventBus.on('*', titleEvents);

    let record = service.submitChanges();
    assert(record != null);
    service.submittedChangesAcknowledged({
      ...record,
      revision: service.headRevision + 1,
    });

    content.insert('hi', { start: 0, end: 0 });
    service.handleExternalChange({
      changeset: Changeset.parseValue([[0, 12], 'hello', [13, 14]]),
      revision: 2,
    });
    content.insert('END', { start: 100, end: 100 });
    content.insert('a', { start: 0, end: 0 });

    service.handleExternalChange({
      changeset: Changeset.parseValue([[0, 17], 'A', [18, 19]]),
      revision: 3,
    });

    service.handleExternalChange({
      changeset: Changeset.parseValue(['DEL']),
      revision: 4,
    });

    record = service.submitChanges();
    if (record) {
      service.submittedChangesAcknowledged({
        ...record,
        revision: service.headRevision + 1,
      });
    }

    service.handleExternalChange({
      changeset: Changeset.parseValue([[0, 14], '_OK', [15, 23]]),
      revision: 6,
    });

    expect(processEventsCalls(contentEvents.mock.calls)).toStrictEqual([
      ['valueChanged', 'hi'],
      ['selectionChanged', { start: 2, end: 2 }],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue([[0, 1]]), revision: 2 }],
      ],
      ['valueChanged', 'hiEND'],
      ['selectionChanged', { start: 5, end: 5 }],
      ['valueChanged', 'ahiEND'],
      ['selectionChanged', { start: 1, end: 1 }],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue([[0, 5]]), revision: 3 }],
      ],
      ['valueChanged', 'DELahiEND'],
      ['valueChanged', 'DELahiEND_OK'],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue([[0, 8], '_OK']), revision: 6 }],
      ],
    ]);

    expect(processEventsCalls(titleEvents.mock.calls)).toStrictEqual([
      ['valueChanged', 'hello'],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue(['hello']), revision: 2 }],
      ],
      ['valueChanged', 'helloA'],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue([[0, 4], 'A']), revision: 3 }],
      ],
      ['valueChanged', ''],
    ]);

    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it('emits correct events 2', () => {
    const title = multiJsonText.getText(TextType.TITLE);
    const content = multiJsonText.getText(TextType.CONTENT);

    const contentEvents = vi.fn();
    content.eventBus.on('*', contentEvents);

    const titleEvents = vi.fn();
    title.eventBus.on('*', titleEvents);

    let record = service.submitChanges();
    if (record) {
      service.submittedChangesAcknowledged({
        ...record,
        revision: service.headRevision + 1,
      });
    }

    content.insert('hi', { start: 0, end: 0 });
    service.handleExternalChange({
      changeset: Changeset.parseValue([[0, 12], 'hello', [13, 14]]),
      revision: 2,
    });
    content.insert('END', { start: 100, end: 100 });
    content.insert('a', { start: 0, end: 0 });

    service.handleExternalChange({
      changeset: Changeset.parseValue([[0, 17], 'A', [18, 19]]),
      revision: 3,
    });

    service.handleExternalChange({
      changeset: Changeset.parseValue(['DEL']),
      revision: 4,
    });

    record = service.submitChanges();
    if (record) {
      service.submittedChangesAcknowledged({
        ...record,
        revision: service.headRevision + 1,
      });
    }

    service.handleExternalChange({
      changeset: Changeset.parseValue([[0, 17], '!', [18, 26]]),
      revision: 7,
    });

    service.handleExternalChange({
      changeset: Changeset.parseValue([[0, 14], '_OK', [15, 23]]),
      revision: 6,
    });

    expect(processEventsCalls(contentEvents.mock.calls)).toStrictEqual([
      ['valueChanged', 'hi'],
      ['selectionChanged', { start: 2, end: 2 }],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue([[0, 1]]), revision: 2 }],
      ],
      ['valueChanged', 'hiEND'],
      ['selectionChanged', { start: 5, end: 5 }],
      ['valueChanged', 'ahiEND'],
      ['selectionChanged', { start: 1, end: 1 }],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue([[0, 5]]), revision: 3 }],
      ],
      ['valueChanged', 'DELahiEND'],
      ['valueChanged', 'DELahiEND_OK'],
      ['valueChanged', 'DELahiEND_OK!'],
      [
        'handledExternalChanges',
        [
          { changeset: Changeset.parseValue([[0, 8], '_OK']), revision: 6 },
          { changeset: Changeset.parseValue([[0, 11], '!']), revision: 7 },
        ],
      ],
    ]);

    expect(processEventsCalls(titleEvents.mock.calls)).toStrictEqual([
      ['valueChanged', 'hello'],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue(['hello']), revision: 2 }],
      ],
      ['valueChanged', 'helloA'],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue([[0, 4], 'A']), revision: 3 }],
      ],
      ['valueChanged', ''],
    ]);

    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it('emits correct handledExternalChanges with retained newline character', () => {
    enum TextType {
      CONTENT = 'CONTENT',
      TITLE = 'TITLE',
    }
    const createMultiJsonTextByService = defineCreateJsonTextFromService<TextType>(
      Object.values(TextType)
    );

    const service = new CollabService();
    service.replaceHeadText({
      revision: 1,
      changeset: Changeset.fromInsertion('{"CONTENT":"\\n abc","TITLE":""}'),
    });

    const multiJsonText = createMultiJsonTextByService(service);
    const contentText = multiJsonText.getText(TextType.CONTENT);

    const contentEvents = vi.fn();
    contentText.eventBus.on('*', contentEvents);

    expect(contentText.value).toStrictEqual('\nabc');

    service.handleExternalChange({
      revision: 2,
      changeset: Changeset.from(
        RetainStrip.create(0, 14),
        InsertStrip.create('A'),
        RetainStrip.create(15, 30)
      ),
    });

    expect(processEventsCalls(contentEvents.mock.calls)).toStrictEqual([
      ['valueChanged', '\nAabc'],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue([0, 'A', [1, 3]]), revision: 2 }],
      ],
    ]);
  });

  it('emits correct handledExternalChanges with retained more newline characters', () => {
    enum TextType {
      CONTENT = 'CONTENT',
      TITLE = 'TITLE',
    }
    const createMultiJsonTextByService = defineCreateJsonTextFromService<TextType>(
      Object.values(TextType)
    );

    const service = new CollabService();
    service.replaceHeadText({
      revision: 1,
      changeset: Changeset.fromInsertion('{"CONTENT":"\\n \\n a\\n bc","TITLE":""}'),
    });

    const multiJsonText = createMultiJsonTextByService(service);
    const contentText = multiJsonText.getText(TextType.CONTENT);

    const contentEvents = vi.fn();
    contentText.eventBus.on('*', contentEvents);

    expect(contentText.value).toStrictEqual('\n\na\nbc');

    service.handleExternalChange({
      revision: 2,
      changeset: Changeset.from(
        RetainStrip.create(0, 17),
        InsertStrip.create('A'),
        RetainStrip.create(18, 21),
        InsertStrip.create('B'),
        RetainStrip.create(22, 36)
      ),
    });

    expect(processEventsCalls(contentEvents.mock.calls)).toStrictEqual([
      ['valueChanged', '\n\nAa\nBbc'],
      [
        'handledExternalChanges',
        [
          {
            changeset: Changeset.parseValue([[0, 1], 'A', [2, 3], 'B', [4, 5]]),
            revision: 2,
          },
        ],
      ],
    ]);
  });

  it('emits correct handledExternalChanges when deleting newline character', () => {
    enum TextType {
      CONTENT = 'CONTENT',
      TITLE = 'TITLE',
    }
    const createMultiJsonTextByService = defineCreateJsonTextFromService<TextType>(
      Object.values(TextType)
    );

    const service = new CollabService();
    service.replaceHeadText({
      revision: 1,
      changeset: Changeset.fromInsertion('{"CONTENT":"\\n \\n abc\\n ","TITLE":""}'),
    });

    const multiJsonText = createMultiJsonTextByService(service);
    const contentText = multiJsonText.getText(TextType.CONTENT);

    const contentEvents = vi.fn();
    contentText.eventBus.on('*', contentEvents);

    expect(contentText.value).toStrictEqual('\n\nabc\n');

    service.handleExternalChange({
      revision: 2,
      changeset: Changeset.from(RetainStrip.create(0, 11), RetainStrip.create(15, 36)),
    });

    expect(processEventsCalls(contentEvents.mock.calls)).toStrictEqual([
      ['valueChanged', '\nabc\n'],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue([[1, 5]]), revision: 2 }],
      ],
    ]);
  });

  it('handles submit changes and external changes', () => {
    enum TextType {
      CONTENT = 'CONTENT',
      TITLE = 'TITLE',
    }
    const createMultiJsonTextByService = defineCreateJsonTextFromService<TextType>(
      Object.values(TextType)
    );

    const service = new CollabService();
    service.replaceHeadText({
      revision: 1,
      changeset: Changeset.fromInsertion('{"CONTENT":"\\n \\n abc","TITLE":""}'),
    });

    const multiJsonText = createMultiJsonTextByService(service);
    const contentText = multiJsonText.getText(TextType.CONTENT);
    expect(service.client.server.toString()).toMatchInlineSnapshot(
      `"(0 -> 34)["{"CONTENT":"\\n \\n abc","TITLE":""}"]"`
    );

    contentText.insert('A', { start: 3, end: 3 });
    const submittedRecord = service.submitChanges()!;
    service.submittedChangesAcknowledged({
      ...submittedRecord,
      revision: 2,
    });
    expect(service.client.server.toString()).toMatchInlineSnapshot(
      `"(0 -> 35)["{"CONTENT":"\\n \\n aAbc","TITLE":""}"]"`
    );

    contentText.insert('A', { start: 4, end: 4 });

    service.handleExternalChange({
      revision: 3,
      changeset: Changeset.from(
        RetainStrip.create(0, 20),
        InsertStrip.create('B'),
        RetainStrip.create(21, 34)
      ),
    });

    expect(service.client.server.toString()).toMatchInlineSnapshot(
      `"(0 -> 36)["{"CONTENT":"\\n \\n aAbBc","TITLE":""}"]"`
    );

    expect(service.serialize(true)).toMatchInlineSnapshot(`
      {
        "history": {
          "lastExecutedIndex": {
            "execute": 1,
            "server": 0,
            "submitted": 0,
          },
          "records": [
            {
              "afterSelection": {
                "start": 20,
              },
              "beforeSelection": {
                "start": 19,
              },
              "changeset": [
                [
                  0,
                  18,
                ],
                "A",
                [
                  19,
                  34,
                ],
              ],
              "serverRecord": {
                "changeset": [
                  [
                    0,
                    18,
                  ],
                  "A",
                  19,
                  "B",
                  [
                    20,
                    33,
                  ],
                ],
                "revision": 3,
              },
              "type": "execute",
            },
            {
              "afterSelection": {
                "start": 21,
              },
              "changeset": [
                [
                  0,
                  19,
                ],
                "A",
                [
                  20,
                  35,
                ],
              ],
              "type": "execute",
            },
          ],
          "serverTailRecord": {
            "changeset": [
              "{"CONTENT":"\\n \\n abc","TITLE":""}",
            ],
            "revision": 1,
          },
          "serverToLocalHistoryTransform": [
            [
              0,
              19,
            ],
            "B",
            [
              20,
              33,
            ],
          ],
        },
        "recordsBuffer": {
          "messages": [],
          "version": 3,
        },
        "submittedRecord": null,
      }
    `);
  });
});

it('serialize service modified by multiJsonText without errors', () => {
  enum TextType {
    CONTENT = 'c',
    TITLE = 't',
  }
  const createMultiJsonTextByService = defineCreateJsonTextFromService<TextType>(
    Object.values(TextType)
  );

  const service = new CollabService({
    generateSubmitId: () => 'aaa',
  });
  const multiJsonText = createMultiJsonTextByService(service);

  const text = multiJsonText.getText(TextType.CONTENT);
  text.insert('foo', {
    start: 0,
    end: 0,
  });

  const service2 = new CollabService({
    ...CollabService.parseValue(service.serialize()),
    logger: createLogger('service', {
      format: 'object',
    }),
  });

  const multiJsonText2 = createMultiJsonTextByService(service2);
  const text2 = multiJsonText2.getText(TextType.CONTENT);
  text2.insert('bar', {
    start: 3,
    end: 3,
  });

  expect(service2.serialize()).toMatchInlineSnapshot(`
    {
      "history": {
        "lastExecutedIndex": {
          "execute": 2,
          "server": -1,
          "submitted": 0,
        },
        "records": [
          {
            "afterSelection": {
              "start": 0,
            },
            "beforeSelection": {
              "start": 0,
            },
            "changeset": [
              "{"c":"","t":""}",
            ],
            "type": "permanent",
          },
          {
            "afterSelection": {
              "start": 9,
            },
            "beforeSelection": {
              "start": 6,
            },
            "changeset": [
              [
                0,
                5,
              ],
              "foo",
              [
                6,
                14,
              ],
            ],
            "type": "execute",
          },
          {
            "afterSelection": {
              "start": 12,
            },
            "changeset": [
              [
                0,
                8,
              ],
              "bar",
              [
                9,
                17,
              ],
            ],
            "type": "execute",
          },
        ],
        "serverTailRecord": {
          "changeset": [],
          "revision": 0,
        },
        "serverToLocalHistoryTransform": null,
      },
      "recordsBuffer": undefined,
      "submittedRecord": {
        "afterSelection": {
          "start": 0,
        },
        "beforeSelection": {
          "start": 0,
        },
        "changeset": [
          "{"c":"","t":""}",
        ],
        "revision": 0,
        "userGeneratedId": "aaa",
      },
    }
  `);
});
