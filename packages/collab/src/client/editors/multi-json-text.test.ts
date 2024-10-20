import { assert, beforeEach, describe, expect, it, vi } from 'vitest';

import { CollabService } from '../collab-service';
import { defineCreateMultiJsonTextByService } from './multi-json-text';
import { Changeset } from '~/changeset';

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

  const createMultiJsonTextByService = defineCreateMultiJsonTextByService<TextType>(
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
});

describe('two texts', () => {
  enum TextType {
    CONTENT = 'c',
    TITLE = 't',
  }
  const createMultiJsonTextByService = defineCreateMultiJsonTextByService<TextType>(
    Object.values(TextType)
  );

  let service: CollabService;
  let multiJsonText: ReturnType<typeof createMultiJsonTextByService>;

  beforeEach(() => {
    service = new CollabService();
    multiJsonText = createMultiJsonTextByService(service);
  });

  it('inserts content', () => {
    const text = multiJsonText.getText(TextType.CONTENT);
    text.insert('foo', {
      start: 0,
      end: 0,
    });

    expect(service.viewText).toStrictEqual('{"c":"foo","t":""}');
    expect(text.value).toStrictEqual('foo');
  });

  it('inserts title', () => {
    const text = multiJsonText.getText(TextType.TITLE);
    text.insert('bar', {
      start: 0,
      end: 0,
    });

    expect(service.viewText).toStrictEqual('{"c":"","t":"bar"}');
    expect(text.value).toStrictEqual('bar');
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
  });

  describe('invalid viewText structure', () => {
    it('plain text => moved to first key', () => {
      const content = multiJsonText.getText(TextType.CONTENT);
      const title = multiJsonText.getText(TextType.TITLE);
      setServiceText(service, 'oops messed up format');
      expect(content.value).toStrictEqual('oops messed up format');
      expect(title.value).toStrictEqual('');
    });
    it('invalid json', () => {
      const title = multiJsonText.getText(TextType.TITLE);
      setServiceText(service, '{c:"val"}');
      title.insert('ok', { start: 0, end: 0 });
      expect(service.viewText).toStrictEqual('{"c":"{c:\\"val\\"}","t":"ok"}');
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
      ['selectionChanged', { start: 0, end: 0 }],
      ['valueChanged', 'DELahiEND_OK'],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue([[0, 8], '_OK']), revision: 6 }],
      ],
    ]);

    expect(titleEvents.mock.calls).toStrictEqual([
      ['selectionChanged', { start: 0, end: 0 }],
      ['valueChanged', 'hello'],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue(['hello']), revision: 2 }],
      ],
      ['selectionChanged', { start: 0, end: 0 }],
      ['selectionChanged', { start: 0, end: 0 }],
      ['valueChanged', 'helloA'],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue([[0, 4], 'A']), revision: 3 }],
      ],
      ['valueChanged', ''],
      ['selectionChanged', { start: 0, end: 0 }],
    ]);
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
      ['selectionChanged', { start: 0, end: 0 }],
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
      ['selectionChanged', { start: 0, end: 0 }],
      ['valueChanged', 'hello'],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue(['hello']), revision: 2 }],
      ],
      ['selectionChanged', { start: 0, end: 0 }],
      ['selectionChanged', { start: 0, end: 0 }],
      ['valueChanged', 'helloA'],
      [
        'handledExternalChanges',
        [{ changeset: Changeset.parseValue([[0, 4], 'A']), revision: 3 }],
      ],
      ['valueChanged', ''],
      ['selectionChanged', { start: 0, end: 0 }],
    ]);
  });
});
