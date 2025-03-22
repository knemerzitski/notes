import { Changeset } from '../changeset';

interface BaseRecord {
  changeset: Changeset;
}

interface Item<TRecord> {
  readonly record: TRecord;
  text?: Changeset;
}

export interface TextMemoRecordsOptions<TRecord extends BaseRecord> {
  tailText?: Changeset;
  records?: readonly TRecord[];
}

function createItem<TRecord>(record: TRecord): Item<TRecord> {
  return {
    record,
  };
}

export class TextMemoRecords<TRecord extends BaseRecord> {
  /**
   * First record that is used when composing records
   */
  tailText: Changeset;
  private _items: Item<TRecord>[];

  get items() {
    return this._items.map((item) => item.record);
  }

  get length() {
    return this._items.length;
  }

  constructor(options?: TextMemoRecordsOptions<TRecord>) {
    this.tailText = options?.tailText ?? Changeset.EMPTY;
    this._items = options?.records?.map(createItem) ?? [];
  }

  getTextAt(index: number): Changeset {
    let textAt = this.tailText;

    let i = index;
    for (; i >= 0; i--) {
      const record = this._items[i];
      if (!record) {
        continue;
      }
      if (record.text) {
        textAt = record.text;
        i++;
        break;
      }
    }

    for (; i <= index; i++) {
      const item = this._items[i];
      if (!item) {
        continue;
      }

      textAt = textAt.compose(item.record.changeset);
      item.text = textAt;
    }

    return textAt;
  }

  push(record: TRecord) {
    this._items.push(createItem(record));
  }

  at(index: number) {
    return this._items[index]?.record;
  }

  splice(start: number, deleteCount: number, ...records: TRecord[]) {
    this._items.splice(start, deleteCount, ...records.map(createItem));
  }

  slice(start?: number, end?: number): TRecord[] {
    return this._items.slice(start, end).map((item) => item.record);
  }

  clear() {
    this._items = [];
  }
}
