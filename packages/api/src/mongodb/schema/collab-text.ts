import { date, Infer, InferRaw, number, object, string } from 'superstruct';

export const TextRecordSchema = object({
  revision: number(),
  text: string(),
});

export type DBTextRecordSchema = InferRaw<typeof TextRecordSchema>;

export type TextRecordSchema = Infer<typeof TextRecordSchema>;

export const CollabTextSchema = object({
  headRecord: TextRecordSchema,
  tailRecord: TextRecordSchema,
  /**
   * One to many relationship to CollabRecord document
   * Records can be queried in range (tailRecord.revision, headRecord.revision]
   */
  // records: array(instance(ObjectId)),
  /**
   * Time when text was last updated
   */
  updatedAt: date(),
});

export type DBCollabTextSchema = InferRaw<typeof CollabTextSchema>;

export type CollabTextSchema = Infer<typeof CollabTextSchema>;
