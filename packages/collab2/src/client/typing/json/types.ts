import { Logger } from '../../../../../utils/src/logging';

import { CollabService } from '../..';

export interface Context<T extends string> {
  readonly logger?: Logger;

  readonly fieldNames: readonly T[];

  readonly parser: Parser;

  readonly collabService: Pick<
    CollabService,
    | 'on'
    | 'off'
    | 'getViewTextAtRevision'
    | 'getViewChangeAtRevision'
    | 'viewRevision'
    | 'addLocalTyping'
  >;
}

export interface Parser {
  parse(value: string): Record<string, unknown>;
  stringify(value: Record<string, string>): string;
  parseString(value: string): string;
  stringifyString(value: string): string;
  parseMetadata(value: string): Record<string, FieldMetadata>;
}

export type ParsedViewText<T extends string> = Record<T, FieldText>;

export interface FieldText {
  readonly value: string;
  readonly metadata: FieldMetadata | null;
}

export interface FieldMetadata {
  readonly start: number;
  readonly end: number;
}
