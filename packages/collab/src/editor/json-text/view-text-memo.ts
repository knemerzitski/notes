import { Infer, InferRaw } from 'superstruct';

import { StructJsonFormatter } from './struct-json-formatter';
import { StringRecordStruct } from './types';
import { Logger } from '../../../../utils/src/logging';

interface JsonValuePosition {
  /**
   * Start index of a stringifed json object property value.
   *
   * E.g. `{"a":"bc"}` has index `6`
   */
  index: number;
  /**
   * Length of a stringifed json object property value.
   *
   * E.g. `{"a":"bc"}` has length `2`
   */
  length: number;
}

export class ViewTextMemo<K extends string, S extends StringRecordStruct> {
  private readonly logger;

  readonly viewText;

  private readonly formatter;

  private _viewTextObject: Infer<S> | null = null;
  private _positionByKey: Record<K, JsonValuePosition> | null = null;

  constructor(
    formatter: StructJsonFormatter<K, S>,
    viewText: InferRaw<S>,
    isFormatted = false,
    options?: {
      logger?: Logger;
    }
  ) {
    this.logger = options?.logger;

    this.formatter = formatter;

    if (!isFormatted) {
      this._viewTextObject = formatter.parse(viewText);
      viewText = formatter.stringify(this.viewTextObject);
    }

    this.viewText = viewText;
  }

  get viewTextObject() {
    if (this._viewTextObject === null) {
      this.logger?.debug('viewTextObject', this.viewText);

      this._viewTextObject = this.formatter.parse(this.viewText);
    }
    return this._viewTextObject;
  }

  get positionByKey(): Record<K, JsonValuePosition> {
    if (this._positionByKey == null) {
      this._positionByKey = Object.fromEntries(
        // Find all key value pairs, e.g. json stringified '{"a": "b"}' matches {1: 'a', 2: 'b'}
        [...this.viewText.matchAll(/"((?:[^"\\]|\\.)*)":"((?:[^"\\]|\\.)*)"/g)].map(
          (match) => {
            const index = match.index;
            const key = match[1] ?? '';
            const value = (match[2] as string | undefined) ?? '';

            return [
              key as K,
              {
                index: index + key.length + 4,
                length: value.length,
              },
            ];
          }
        )
      ) as Record<K, JsonValuePosition>;
      this.logger?.debug('positionByKey', this._positionByKey);
    }
    return this._positionByKey;
  }
}
