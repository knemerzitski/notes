import { array, date, Infer, object, string } from 'superstruct';
import { CollabTextSchema } from './collab-text';

export const CollabSchema = object({
  /**
   * Collaborative editing texts by field name.
   * Using array instead of map for easier indexing. \
   * GraphQL uses enum NoteTextField for key.
   */
  texts: array(
    // Conforms to $arrayToObject structure
    object({
      k: string(),
      v: CollabTextSchema,
    })
  ),
  /**
   * Time when collabTexts was last updated
   */
  updatedAt: date(),
});

export type CollabSchema = Infer<typeof CollabSchema>;
