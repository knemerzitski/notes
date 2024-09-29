import { assert, beforeEach, describe, expect, it, vi } from 'vitest';

import { CollabEditor } from '../collab-editor';
import { defineCreateMultiJsonTextEditor } from './multi-json-text';
import { Changeset } from '~/changeset';

function setEditorText(editor: CollabEditor, value: string) {
  editor.pushSelectionChangeset(
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

  const createMultiJsonTextEditor = defineCreateMultiJsonTextEditor<TextType>(
    Object.values(TextType)
  );

  let editor: CollabEditor;
  let multiJsonTextEditor: ReturnType<typeof createMultiJsonTextEditor>;

  beforeEach(() => {
    editor = new CollabEditor();
    multiJsonTextEditor = createMultiJsonTextEditor(editor);
  });

  it('keeps insert within bounds', () => {
    const text = multiJsonTextEditor.getText(TextType.CONTENT);

    text.insert('foo', {
      start: 0,
      end: 0,
    });
    expect(editor.viewText).toStrictEqual('{"c":"foo"}');
    expect(text.value).toStrictEqual('foo');

    text.insert('bar', {
      start: 5000,
      end: 10000,
    });
    expect(editor.viewText).toStrictEqual('{"c":"foobar"}');
    expect(text.value).toStrictEqual('foobar');

    text.insert('d', {
      start: -10000,
      end: 10000,
    });
    expect(editor.viewText).toStrictEqual('{"c":"d"}');
    expect(text.value).toStrictEqual('d');
  });

  it('keeps delete within bounds', () => {
    setEditorText(editor, '{"c":"d"}');
    const text = multiJsonTextEditor.getText(TextType.CONTENT);

    text.delete(100, {
      start: -10000,
      end: 10000,
    });
    expect(editor.viewText).toStrictEqual('{"c":""}');
    expect(text.value).toStrictEqual('');
  });

  it('leaves unknown properties unmodified', () => {
    setEditorText(editor, '{"c":"d", "ignore": 5}');
    const text = multiJsonTextEditor.getText(TextType.CONTENT);
    text.insert('a', { start: 1, end: 1 });
    expect(editor.viewText).toStrictEqual('{"c":"da","ignore":5}');
  });
});

describe('two texts', () => {
  enum TextType {
    CONTENT = 'c',
    TITLE = 't',
  }
  const createMultiJsonTextEditor = defineCreateMultiJsonTextEditor<TextType>(
    Object.values(TextType)
  );

  let editor: CollabEditor;
  let multiJsonTextEditor: ReturnType<typeof createMultiJsonTextEditor>;

  beforeEach(() => {
    editor = new CollabEditor();
    multiJsonTextEditor = createMultiJsonTextEditor(editor);
  });

  it('inserts content', () => {
    const text = multiJsonTextEditor.getText(TextType.CONTENT);
    text.insert('foo', {
      start: 0,
      end: 0,
    });

    expect(editor.viewText).toStrictEqual('{"c":"foo","t":""}');
    expect(text.value).toStrictEqual('foo');
  });

  it('inserts title', () => {
    const text = multiJsonTextEditor.getText(TextType.TITLE);
    text.insert('bar', {
      start: 0,
      end: 0,
    });

    expect(editor.viewText).toStrictEqual('{"c":"","t":"bar"}');
    expect(text.value).toStrictEqual('bar');
  });

  it('adjusts to changing editor viewText', () => {
    const content = multiJsonTextEditor.getText(TextType.CONTENT);
    const title = multiJsonTextEditor.getText(TextType.TITLE);

    content.insert('foo', {
      start: 0,
      end: 0,
    });
    title.insert('bar', {
      start: 0,
      end: 0,
    });
    expect(editor.viewText).toStrictEqual('{"c":"foo","t":"bar"}');

    setEditorText(editor, '{"t":"title","c":"content"}');
    expect(content.value).toStrictEqual('content');
    expect(title.value).toStrictEqual('title');

    title.insert('t', {
      start: 1,
      end: 2,
    });
    setEditorText(editor, '{"t":"tttle","c":"content"}');
  });

  describe('invalid viewText structure', () => {
    it('plain text => moved to first key', () => {
      const content = multiJsonTextEditor.getText(TextType.CONTENT);
      const title = multiJsonTextEditor.getText(TextType.TITLE);
      setEditorText(editor, 'oops messed up format');
      expect(content.value).toStrictEqual('oops messed up format');
      expect(title.value).toStrictEqual('');
    });
    it('invalid json', () => {
      const title = multiJsonTextEditor.getText(TextType.TITLE);
      setEditorText(editor, '{c:"val"}');
      title.insert('ok', { start: 0, end: 0 });
      expect(editor.viewText).toStrictEqual('{"c":"{c:\\"val\\"}","t":"ok"}');
    });
  });

  it('emits correct events', () => {
    const title = multiJsonTextEditor.getText(TextType.TITLE);
    const content = multiJsonTextEditor.getText(TextType.CONTENT);

    const contentEvents = vi.fn();
    content.eventBus.on('*', contentEvents);

    const titleEvents = vi.fn();
    title.eventBus.on('*', titleEvents);

    let record = editor.submitChanges();
    assert(record != null);
    editor.submittedChangesAcknowledged({
      ...record,
      revision: editor.headRevision + 1,
    });

    content.insert('hi', { start: 0, end: 0 });
    editor.handleExternalChange({
      changeset: Changeset.parseValue([[0, 12], 'hello', [13, 14]]),
      revision: 2,
    });
    content.insert('END', { start: 100, end: 100 });
    content.insert('a', { start: 0, end: 0 });

    editor.handleExternalChange({
      changeset: Changeset.parseValue([[0, 17], 'A', [18, 19]]),
      revision: 3,
    });

    editor.handleExternalChange({
      changeset: Changeset.parseValue(['DEL']),
      revision: 4,
    });

    record = editor.submitChanges();
    if (record) {
      editor.submittedChangesAcknowledged({
        ...record,
        revision: editor.headRevision + 1,
      });
    }

    editor.handleExternalChange({
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
    const title = multiJsonTextEditor.getText(TextType.TITLE);
    const content = multiJsonTextEditor.getText(TextType.CONTENT);

    const contentEvents = vi.fn();
    content.eventBus.on('*', contentEvents);

    const titleEvents = vi.fn();
    title.eventBus.on('*', titleEvents);

    let record = editor.submitChanges();
    if (record) {
      editor.submittedChangesAcknowledged({
        ...record,
        revision: editor.headRevision + 1,
      });
    }

    content.insert('hi', { start: 0, end: 0 });
    editor.handleExternalChange({
      changeset: Changeset.parseValue([[0, 12], 'hello', [13, 14]]),
      revision: 2,
    });
    content.insert('END', { start: 100, end: 100 });
    content.insert('a', { start: 0, end: 0 });

    editor.handleExternalChange({
      changeset: Changeset.parseValue([[0, 17], 'A', [18, 19]]),
      revision: 3,
    });

    editor.handleExternalChange({
      changeset: Changeset.parseValue(['DEL']),
      revision: 4,
    });

    record = editor.submitChanges();
    if (record) {
      editor.submittedChangesAcknowledged({
        ...record,
        revision: editor.headRevision + 1,
      });
    }

    editor.handleExternalChange({
      changeset: Changeset.parseValue([[0, 17], '!', [18, 26]]),
      revision: 7,
    });

    editor.handleExternalChange({
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
