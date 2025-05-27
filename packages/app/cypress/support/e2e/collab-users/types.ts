import { CollabService, Selection } from '../../../../../collab/src';
import { GraphQLService } from '../../../../src/graphql/types';
import { NoteTextFieldEditor, NoteTextFieldName } from '../../../../src/note/types';

import { SimpleTextField } from './simple-text-field';

export type Field = 'title' | 'content';

export interface UserContext {
  userId: string;
  type: 'interface' | 'background';
  graphQLService: GraphQLService;
  collabService: {
    service: CollabService;
    fields: Record<NoteTextFieldName, NoteTextFieldEditor>;
  };
  editor: Record<Field, FieldEditor>;
  submitChanges: () => Promise<void>;
}

export interface TextOperationOptions {
  delay?: number;
  /**
   * Don't queue operation for submission.
   * @default false
   */
  noSubmit?: boolean;
}

export interface FieldEditor {
  getValue(): PromiseLike<string>;
  insert(value: string, options?: TextOperationOptions): void;
  delete(count: number, options?: TextOperationOptions): void;
  select(start: number, end?: number, options?: TextOperationOptions): void;
  selectOffset(offset: number, options?: TextOperationOptions): void;
}

export type TextOperation = (
  | {
      type: 'insert';
      value: string;
    }
  | {
      type: 'delete';
      count: number;
    }
  | {
      type: 'selectOffset';
      offset: Selection;
    }
) & {
  simpleField: SimpleTextField;
  options?: TextOperationOptions;
};
