import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from 'vitest';

import { CollabService } from '../../client/collab-service';
import { Changeset } from '~/changeset';
import { defineCreateJsonTextFromService } from './create-service-json-text';

function setServiceText(service: CollabService, value: string) {
  service.pushSelectionChangeset(
    {
      changeset: Changeset.fromInsertion(value),
      afterSelection: { start: 0, end: 0 },
    },
    {
      merge: true,
    }
  );
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

    expect(service.viewText).toMatchInlineSnapshot(`"{"c":"\\n"}"`);
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
      `"{"c":"start\\n\\nr\\neplaced\\n\\nend"}"`
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
    expect(service.viewText).toMatchInlineSnapshot(`"{"c":"\\n\\nstart\\n\\n\\nend"}"`);
  });

  it('emits external change json with escaped characters', () => {
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
      changeset: Changeset.parseValue([[0, 7], 'a', [8, 9]]),
      revision: service.headRevision + 1,
    });

    expect(service.viewText).toMatchInlineSnapshot(`"{"c":"\\na"}"`);
    expect(content.value).toMatchInlineSnapshot(`
      "
      a"
    `);

    expect(contentEvents.mock.calls).toStrictEqual([
      ['valueChanged', '\n'],
      ['selectionChanged', { start: 1, end: 1 }],
      ['valueChanged', '\na'],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue([0, 'a']), revision: 2 }],
      ],
    ]);
  });

  it('emits external change json with escaped characters 2', () => {
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
      changeset: Changeset.parseValue([[0, 9], 'a\\nb', [10, 11]]),
      revision: service.headRevision + 1,
    });

    expect(service.viewText).toMatchInlineSnapshot(`"{"c":"\\n\\na\\nb"}"`);
    expect(content.value).toMatchInlineSnapshot(`
      "

      a
      b"
    `);

    expect(contentEvents.mock.calls).toStrictEqual([
      ['valueChanged', '\n\n'],
      ['selectionChanged', { start: 2, end: 2 }],
      ['valueChanged', '\n\na\nb'],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue([[0, 1], 'a\nb']), revision: 2 }],
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
  const createMultiJsonTextByService = defineCreateJsonTextFromService<TextType>(
    Object.values(TextType)
  );

  let service: CollabService;
  let multiJsonText: ReturnType<typeof createMultiJsonTextByService>;
  let errorSpy: MockInstance;

  beforeEach(() => {
    service = new CollabService();
    multiJsonText = createMultiJsonTextByService(service);
    errorSpy = vi.spyOn(console, 'error');
    errorSpy.mockImplementation(() => {
      // do nothing
    });
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
      const errorSpy = vi.spyOn(console, 'error');
      errorSpy.mockImplementation(() => {
        // do nothing
      });

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

    expect(contentEvents.mock.calls).toStrictEqual([
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

    expect(titleEvents.mock.calls).toStrictEqual([
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

    expect(contentEvents.mock.calls).toStrictEqual([
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

    expect(titleEvents.mock.calls).toStrictEqual([
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
});

it('serialize/parseValue multiJsonText without errors', () => {
  enum TextType {
    CONTENT = 'c',
    TITLE = 't',
  }
  const createMultiJsonTextByService = defineCreateJsonTextFromService<TextType>(
    Object.values(TextType)
  );

  const service = new CollabService();
  const multiJsonText = createMultiJsonTextByService(service);

  const text = multiJsonText.getText(TextType.CONTENT);
  text.insert('foo', {
    start: 0,
    end: 0,
  });

  const service2 = new CollabService(CollabService.parseValue(service.serialize()));
  const multiJsonText2 = createMultiJsonTextByService(service2);
  const text2 = multiJsonText2.getText(TextType.CONTENT);
  text2.insert('bar', {
    start: 3,
    end: 3,
  });
  expect(service2.serialize()).toMatchInlineSnapshot(`
    {
      "client": {
        "local": [
          "{"c":"foobar","t":""}",
        ],
        "server": undefined,
      },
      "history": {
        "entries": [
          {
            "execute": {
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
              "selection": {
                "start": 9,
              },
            },
            "undo": {
              "changeset": [
                [
                  0,
                  5,
                ],
                [
                  9,
                  17,
                ],
              ],
              "selection": {
                "start": 6,
              },
            },
          },
          {
            "execute": {
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
              "selection": {
                "start": 12,
              },
            },
            "undo": {
              "changeset": [
                [
                  0,
                  8,
                ],
                [
                  12,
                  20,
                ],
              ],
              "selection": {
                "start": 9,
              },
            },
          },
        ],
        "lastExecutedIndex": {
          "local": 1,
          "server": -1,
          "submitted": -1,
        },
        "tailComposition": null,
        "tailText": [
          "{"c":"","t":""}",
        ],
      },
      "recordsBuffer": undefined,
      "submittedRecord": null,
    }
  `);
});
