import { StringRecordStruct, KeyViewText } from './types';
import { ViewTextMemosCache } from './view-text-memos-cache';

export class ViewTextKeyView<K extends string, S extends StringRecordStruct>
  implements KeyViewText
{
  private readonly memosCache;
  private readonly key;

  get value() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.memosCache.view.viewTextObject[this.key]!;
  }

  get jsonValueOffset() {
    return this.memosCache.view.positionByKey[this.key].index;
  }

  get jsonValueLength() {
    return this.memosCache.view.positionByKey[this.key].length;
  }

  constructor(memosCache: ViewTextMemosCache<K, S>, key: K) {
    this.memosCache = memosCache;
    this.key = key;
  }
}
