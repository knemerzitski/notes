import { PipelineStage } from 'mongoose';
import { DBCollabText } from '../models/collab/collab-text';
import { DBUserNote } from '../models/user-note';
import { DBNote } from '../models/note';

interface CollabTextInput {
  pipeline?: PipelineStage.Lookup['$lookup']['pipeline'];
}

interface NoteInput {
  pipeline?: PipelineStage.Lookup['$lookup']['pipeline'];
}

export interface ProjectUserNoteInput<TCollabTextKey extends string> {
  /**
   * Collection names for lookup
   */
  collectionNames: {
    note: string;
    collaborativeDocument: string;
  };

  /**
   * Collab texts lookup related input.
   */
  collabTexts?: Record<TCollabTextKey, CollabTextInput>;

  /**
   * Note lookup related info
   */
  note?: NoteInput;
}

export type ProjectUserNoteOutput<
  TCollabTextKey extends string,
  TCollabTextPipeline = DBCollabText,
  TNotePipeline = Omit<DBNote, 'publicId' | 'collabTexts'>,
> = Omit<DBUserNote, 'userId' | 'note'> & {
  note: Omit<DBUserNote['note'], 'collabTexts'> & {
    collabTexts: Record<TCollabTextKey, TCollabTextPipeline>;
  };
  notePipeline?: TNotePipeline;
};

// TODO rename to userNoteLookup
export default function projectUserNote<TCollabTextKey extends string>({
  collectionNames,
  collabTexts,
  note,
}: ProjectUserNoteInput<TCollabTextKey>): PipelineStage[] {
  return [
    {
      $unset: ['userId'],
    },
    ...(collabTexts
      ? Object.entries<CollabTextInput>(collabTexts).flatMap(
          ([collabTextKey, collabTextInput]) => [
            {
              $lookup: {
                from: collectionNames.collaborativeDocument,
                foreignField: '_id',
                localField: `note.collabTexts.${collabTextKey}.collabTextId`,
                as: `note.collabTexts.${collabTextKey}`,
                pipeline: collabTextInput.pipeline,
              },
            },
            {
              $set: {
                [`note.collabTexts.${collabTextKey}`]: {
                  $arrayElemAt: [`$note.collabTexts.${collabTextKey}`, 0],
                },
              },
            },
          ]
        )
      : []),
    ...(note?.pipeline
      ? [
          {
            $lookup: {
              from: collectionNames.note,
              foreignField: '_id',
              localField: 'note.id',
              as: 'note.notePipeline',
              pipeline: [
                {
                  $unset: ['_id', 'publicId', 'collabTexts'],
                },
                ...note.pipeline,
              ],
            },
          },
          {
            $set: {
              'note.lookupNote': {
                $arrayElemAt: ['$note.lookupNote', 0],
              },
            },
          },
        ]
      : []),
  ];
}
