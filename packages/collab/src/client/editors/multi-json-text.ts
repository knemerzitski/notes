/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { coerce, defaulted, Infer, InferRaw, string, Struct, type } from 'superstruct';
import { CollabEditor, CollabEditorEvents } from '../collab-editor';
import { SelectionRange } from '../selection-range';
import { indexOfDiff, lengthOffsetOfDiff } from '~utils/string/diff';
import {
  SelectionChangeset,
  SimpleText,
  SimpleTextEvents,
  SimpleTextOperationOptions,
} from '../types';
import mitt, { Emitter, EmitterPickEvents } from 'mitt';
import { insertToSelectionChangeset } from './utils/insert-to-selection-changeset';
import { deleteCountToSelectionChangeset } from './utils/delete-count-to-selection-changeset';
import { Changeset } from '../../changeset';
import { isDefined } from '~utils/type-guards/is-defined';

type StringRecordStruct = Struct<
  Record<string, string>,
  Record<string, Struct<string, null, string>>,
  string
>;

interface ViewTextAtRevision<K extends string, S extends StringRecordStruct> {
  revision: number;
  memo: ViewTextMemo<K, S>;
}

interface KeyViewText {
  value: string;
  parentOffset: number;
  lengthOffset: number;
}

export function defineCreateMultiJsonTextEditor<K extends string>(keys: readonly K[]) {
  const struct = createStruct(keys);
  return (
    editor: ConstructorParameters<typeof MultiJsonText<K, StringRecordStruct>>[1]
  ) => new MultiJsonText(struct, editor);
}

function createStruct<K extends string>(keys: readonly K[]): StringRecordStruct {
  return coerce(
    defaulted(
      type(Object.fromEntries(keys.map((key) => [key, defaulted(string(), () => '')]))),
      () => ({})
    ),
    string(),
    (value) => {
      if (value.trim().length === 0) {
        return;
      }

      try {
        const obj = JSON.parse(value);
        if (typeof obj === 'string' && keys[0]) {
          return {
            [keys[0]]: obj,
          };
        }
        return obj;
      } catch (err) {
        if (keys[0]) {
          return {
            [keys[0]]: value,
          };
        }
      }
      return;
    },
    (value) => JSON.stringify(value)
  );
}

class MultiJsonText<K extends string, S extends StringRecordStruct> {
  private readonly viewsCache;
  private readonly editor;

  private syncDuringProcessingMessages = false;
  private localPushCounter = 0;

  private readonly textViewsMap;

  private readonly eventsOff;

  constructor(
    struct: S,
    editor: Pick<CollabEditor, 'viewText' | 'pushSelectionChangeset' | 'headRevision'> & {
      eventBus: EmitterPickEvents<
        CollabEditor['eventBus'],
        | 'viewChanged'
        | 'appliedTypingOperation'
        | 'handledExternalChanges'
        | 'processingMessages'
        | 'headRevisionChanged'
      >;
    }
  ) {
    const keys = Object.keys(struct.schema) as K[];

    this.editor = editor;
    this.viewsCache = new ViewTextMemosCache<K, S>(struct, editor);

    const keySimpleTextParent: ConstructorParameters<typeof KeySimpleText>[0]['editor'] =
      {
        get viewText() {
          return editor.viewText;
        },
        pushSelectionChangeset: this.pushSelectionChangeset.bind(this),
      };

    this.textViewsMap = Object.fromEntries(
      keys.map((key) => [
        key,
        new KeySimpleText({
          editor: keySimpleTextParent,
          view: new ViewTextMemosCacheKeyView(this.viewsCache, key),
          prevView: new ViewTextMemosCacheKeyPrevView(this.viewsCache, key),
          getClosestOlderRevisionView: (revision) => {
            const revisionView = this.viewsCache.getClosestOlderRevisionView(revision);
            if (!revisionView) {
              return;
            }

            return {
              value: revisionView.objStr,
              parentOffset: revisionView.getKeyIndex(key),
              lengthOffset: revisionView.getKeyLengthOffset(key),
            };
          },
        }),
      ])
    ) as Record<K, KeySimpleText>;
    const textViewsList = Object.values<KeySimpleText>(this.textViewsMap);

    this.eventsOff = [
      editor.eventBus.on('viewChanged', () => {
        const view = this.viewsCache.newView();
        if (this.localPushCounter === 0) {
          // Change happened outside this context, must ensure text is in sync with object structure
          if (this.syncView(view)) {
            // viewText had invalid structure
            return;
          }
        }

        this.viewsCache.pushView(view);

        textViewsList.forEach((textView) => {
          textView.valueUpdated();
        });
      }),
      editor.eventBus.on('appliedTypingOperation', ({ operation: { selection } }) => {
        textViewsList.forEach((textView) => {
          textView.parentSelectionUpdated(selection);
        });
      }),
      editor.eventBus.on('processingMessages', () => {
        this.syncDuringProcessingMessages = false;
      }),
      editor.eventBus.on('handledExternalChanges', (payload) => {
        if (this.syncDuringProcessingMessages) {
          return;
        }

        textViewsList.forEach((textView) => {
          textView.parentHandledExternalChange(payload);
        });
      }),
    ];

    this.syncView(this.viewsCache.view, true);
  }

  /**
   * Removes event listeners. This instance becomes useless.
   */
  cleanUp() {
    this.eventsOff.forEach((off) => {
      off();
    });
    this.viewsCache.cleanUp();
  }

  getText(key: K): KeySimpleText {
    return this.textViewsMap[key];
  }

  private pushSelectionChangeset(
    setChangeset: SelectionChangeset,
    options?: SimpleTextOperationOptions
  ) {
    try {
      this.localPushCounter++;
      // make this an external change instead??
      this.editor.pushSelectionChangeset(setChangeset, options);
    } finally {
      this.localPushCounter--;
    }
  }

  private syncView(view: ViewTextMemo<K, S>, merge = false) {
    if (this.editor.viewText !== view.objStr) {
      this.syncDuringProcessingMessages = true;
      // when this happens prevent other events?
      this.pushSelectionChangeset(
        {
          changeset: Changeset.fromInsertion(view.objStr),
          afterSelection: SelectionRange.ZERO,
        },
        {
          merge,
        }
      );
      return true;
    } else {
      return false;
    }
  }
}

class ViewTextMemosCache<K extends string, S extends StringRecordStruct> {
  private readonly struct;
  private readonly editor;

  private readonly views: ViewTextAtRevision<K, S>[] = [];

  private readonly eventsOff;

  private _view: ViewTextMemo<K, S>;
  get view() {
    return this._view;
  }

  private _prevView: ViewTextMemo<K, S> | null = null;
  get prevView() {
    return this._prevView ?? this._view;
  }

  constructor(
    struct: S,
    editor: Pick<CollabEditor, 'viewText' | 'headRevision'> & {
      eventBus: EmitterPickEvents<CollabEditor['eventBus'], 'headRevisionChanged'>;
    }
  ) {
    this.struct = struct;
    this.editor = editor;

    this._view = this.newView();
    this.pushView(this._view);

    this.eventsOff = [
      editor.eventBus.on('headRevisionChanged', ({ revision }) => {
        // Remove unused revisions
        const index = this.views.findLastIndex((item) => item.revision === revision);
        if (index > 0) {
          this.views.splice(0, index);
        }
      }),
    ];
  }

  cleanUp() {
    this.eventsOff.forEach((off) => {
      off();
    });
  }

  newView() {
    return new ViewTextMemo<K, S>(this.struct, this.editor.viewText);
  }

  pushView(view: ViewTextMemo<K, S>) {
    const revision = this.editor.headRevision;
    const item: ViewTextAtRevision<K, S> = {
      revision: this.editor.headRevision,
      memo: view,
    };

    const last = this.views[this.views.length - 1];
    if (last && last.revision === revision) {
      this.views[this.views.length - 1] = item;
    } else {
      this.views.push(item);
    }

    this._prevView = last?.memo ?? null;
    this._view = view;
  }

  getClosestOlderRevisionView(revision: number) {
    const index = this.views.findLastIndex((item) => item.revision === revision);
    if (index > 0) {
      return this.views[index - 1]?.memo;
    }
    return;
  }
}

class ViewTextMemosCacheKeyView<K extends string, S extends StringRecordStruct>
  implements KeyViewText
{
  private readonly memosCache;
  private readonly key;

  get value() {
    return this.memosCache.view.obj[this.key]!;
  }

  get parentOffset() {
    return this.memosCache.view.getKeyIndex(this.key);
  }

  get lengthOffset() {
    return this.memosCache.view.getKeyLengthOffset(this.key);
  }

  constructor(memosCache: ViewTextMemosCache<K, S>, key: K) {
    this.memosCache = memosCache;
    this.key = key;
  }
}

class ViewTextMemosCacheKeyPrevView<K extends string, S extends StringRecordStruct>
  implements KeyViewText
{
  private readonly memosCache;
  private readonly key;

  get value() {
    return this.memosCache.prevView.obj[this.key]!;
  }
  get parentOffset() {
    return this.memosCache.prevView.getKeyIndex(this.key);
  }

  get lengthOffset() {
    return this.memosCache.prevView.getKeyLengthOffset(this.key);
  }

  constructor(memosCache: ViewTextMemosCache<K, S>, key: K) {
    this.memosCache = memosCache;
    this.key = key;
  }
}

class KeySimpleText implements SimpleText {
  readonly eventBus: Emitter<SimpleTextEvents>;

  private readonly editor;

  private readonly view;
  private readonly prevView;
  private readonly getClosestOlderRevisionView;

  get value() {
    return this.view.value;
  }

  private get length() {
    return this.value.length;
  }

  private get parentOffset() {
    return this.view.parentOffset;
  }

  constructor({
    editor,
    view,
    prevView,
    getClosestOlderRevisionView,
  }: {
    editor: {
      viewText: CollabEditor['viewText'];
      pushSelectionChangeset: CollabEditor['pushSelectionChangeset'];
    };
    view: KeyViewText;
    prevView: KeyViewText;
    getClosestOlderRevisionView: (revision: number) => KeyViewText | undefined;
  }) {
    this.editor = editor;

    this.view = view;
    this.prevView = prevView;
    this.getClosestOlderRevisionView = getClosestOlderRevisionView;

    this.eventBus = mitt();
  }

  private selectionTransform(selection: SelectionRange): SelectionRange {
    return {
      start: Math.max(0, Math.min(selection.start - this.parentOffset, this.length)),
      end: Math.max(0, Math.min(selection.end - this.parentOffset, this.length)),
    };
  }

  private selectionTransformInverse(selection: SelectionRange): SelectionRange {
    return {
      start: this.parentOffset + Math.max(0, Math.min(selection.start, this.length)),
      end: this.parentOffset + Math.max(0, Math.min(selection.end, this.length)),
    };
  }

  valueUpdated() {
    if (this.prevView.value !== this.view.value) {
      this.eventBus.emit('valueChanged', this.view.value);
    }
  }

  parentSelectionUpdated(selection: SelectionRange) {
    this.eventBus.emit('selectionChanged', this.selectionTransform(selection));
  }

  parentHandledExternalChange(payload: CollabEditorEvents['handledExternalChanges']) {
    const haveEvents =
      !!this.eventBus.all.get('handledExternalChanges')?.length ||
      !!this.eventBus.all.get('*')?.length;
    if (!haveEvents) {
      return;
    }

    const transformedEvents = payload
      .map(({ revision, event }) => {
        const beforeView = this.getClosestOlderRevisionView(revision);
        if (!beforeView) {
          return;
        }

        const leftBoundary = beforeView.parentOffset - 1;
        const rightBoundary = beforeView.value.length - beforeView.lengthOffset + 1;

        const changeset = new Changeset(
          event.viewComposable.strips
            .sliceByRetain(leftBoundary, rightBoundary)
            .shrink(1, 1)
            .offset(-(leftBoundary + 1))
        );

        if (changeset.length > 0) {
          return { changeset, revision };
        }
        return;
      })
      .filter(isDefined);

    if (transformedEvents.length === 0) {
      return;
    }

    this.eventBus.emit('handledExternalChanges', transformedEvents);
  }

  insert(
    insertText: string,
    selection: SelectionRange,
    options?: SimpleTextOperationOptions
  ): void {
    this.editor.pushSelectionChangeset(
      insertToSelectionChangeset(
        insertText,
        this.editor.viewText,
        this.selectionTransformInverse(selection)
      ),
      options
    );
  }

  delete(count = 1, selection: SelectionRange, options?: SimpleTextOperationOptions) {
    this.editor.pushSelectionChangeset(
      deleteCountToSelectionChangeset(
        Math.min(this.length, count),
        this.editor.viewText,
        this.selectionTransformInverse(selection)
      ),
      options
    );
  }
}

class ViewTextMemo<K extends string, S extends StringRecordStruct> {
  private readonly struct: S;
  private readonly viewText: InferRaw<S>;

  private _obj: Infer<S> | null = null;
  private _objStr: InferRaw<S> | null = null;
  private _emptyKeyObjStrMap: Map<K, InferRaw<S>> | null;
  private _indexMap: Map<K, number> | null;
  private _lengthOffsetMap: Map<K, number> | null;

  constructor(struct: S, viewText: InferRaw<S>) {
    this.struct = struct;
    this.viewText = viewText;
  }

  get obj() {
    if (this._obj === null) {
      this._obj = this.struct.create(this.viewText);
    }
    return this._obj;
  }

  get objStr() {
    if (this._objStr === null) {
      this._objStr = this.struct.createRaw(this.obj);
    }
    return this._objStr;
  }

  getEmptyKeyObjStr(key: K) {
    if (!this._emptyKeyObjStrMap) {
      this._emptyKeyObjStrMap = new Map();
    }
    let emptyKeyObjStr = this._emptyKeyObjStrMap.get(key);
    if (emptyKeyObjStr === undefined) {
      emptyKeyObjStr = this.struct.createRaw({
        ...this.obj,
        [key]: '\u0000',
      });
      this._emptyKeyObjStrMap.set(key, emptyKeyObjStr);
    }
    return emptyKeyObjStr;
  }

  getKeyIndex(key: K) {
    if (!this._indexMap) {
      this._indexMap = new Map();
    }
    let index = this._indexMap.get(key);
    if (index === undefined) {
      index = indexOfDiff(this.objStr, this.getEmptyKeyObjStr(key));
      this._indexMap.set(key, index);
    }
    return index;
  }

  getKeyLengthOffset(key: K) {
    if (!this._lengthOffsetMap) {
      this._lengthOffsetMap = new Map();
    }
    let lengthOffset = this._lengthOffsetMap.get(key);
    if (lengthOffset === undefined) {
      lengthOffset = lengthOffsetOfDiff(this.objStr, this.getEmptyKeyObjStr(key));
      this._lengthOffsetMap.set(key, lengthOffset);
    }
    return lengthOffset;
  }
}
