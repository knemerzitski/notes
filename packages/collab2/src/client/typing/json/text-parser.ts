import mapObject from 'map-obj';

import { Logger } from '../../../../../utils/src/logging';

import { FieldMetadata, Parser } from './types';
import { stringifiedMetadata } from './utils/stringified-metadata';

export interface TextParseHook {
  preStringify(value: string): string;
  postParse(value: string): string;
}

export class TextParser implements Parser {
  constructor(
    private readonly context: {
      readonly keys: readonly string[];
      /**
       * Fallback key used when parsing fails
       */
      readonly fallbackKey: string;
      readonly logger?: Logger;
      /**
       * Modify value when it's parsed or stringified
       */
      readonly hook?: TextParseHook;
    }
  ) {}

  private get logger() {
    return this.context.logger;
  }

  private get keys() {
    return this.context.keys;
  }

  private get fallbackKey() {
    return this.context.fallbackKey;
  }

  private get hook() {
    return this.context.hook;
  }

  parse(value: string): Record<string, unknown> {
    let obj = this.parseToObject(value);

    if (this.hook) {
      const hooks = this.hook;
      obj = mapObject(obj, (key, val) => [
        key,
        this.keys.includes(key) ? hooks.postParse(String(val)) : val,
      ]);
    }

    return obj;
  }

  stringify(value: Record<string, unknown>): string {
    if (this.hook) {
      const hooks = this.hook;
      value = mapObject(value, (key, val) => [
        key,
        this.keys.includes(key) ? hooks.preStringify(String(val)) : val,
      ]);
    }

    return JSON.stringify(value);
  }

  parseString(value: string): string {
    let parsedValue = JSON.parse(`"${value}"`) as string;

    if (this.hook) {
      parsedValue = this.hook.postParse(parsedValue);
    }

    return parsedValue;
  }

  stringifyString(value: string): string {
    if (this.hook) {
      value = this.hook.preStringify(value);
    }

    return JSON.stringify(value).slice(1, -1);
  }

  parseMetadata(value: string): Record<string, FieldMetadata> {
    return stringifiedMetadata(value);
  }

  private parseToObject(value: string): Record<string, unknown> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsedValue = JSON.parse(value);
      if (typeof parsedValue === 'string') {
        return {
          [this.fallbackKey]: parsedValue,
        };
      }

      return parsedValue as Record<string, unknown>;
    } catch (err) {
      this.logger?.error('parse', {
        value,
        err,
      });

      return {
        [this.fallbackKey]: value,
      };
    }
  }
}
