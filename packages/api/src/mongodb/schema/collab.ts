import { Entry } from '../types';
import { CollabTextSchema } from './collab-text';

export interface CollabSchema {
  /**
   * Collaborative editing texts by field name.
   * Using array instead of map for easier indexing. \
   * GraphQL uses enum NoteTextField for key.
   */
  texts: Entry<string, CollabTextSchema>[];
  /**
   * Time when collabTexts was last updated
   */
  updatedAt?: Date;
}
