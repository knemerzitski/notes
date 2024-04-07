import { PipelineStage } from 'mongoose';
import { DBCollabText } from '../models/collab/collab-text';
import { DBUserNote } from '../models/user-note';
import { DBNote } from '../models/note';

export interface ProjectUserNoteInput<TField extends string> {
  /**
   * Note collabTexts to include by key
   */
  noteCollabTexts: TField[]; // TODO combine noteCollabTexts with collaborativeDocumentPipeline, can have separate pipeline for TITLE and CONTENT
  /**
   * Collection names for lookup
   */
  collectionNames: {
    note: string;
    collaborativeDocument: string;
  };
  /**
   * Include note only fields: ownerId
   */
  lookupNote?: boolean;
  /**
   * Pipeline to use on CollaborativeDocument lookup
   */
  collaborativeDocumentPipeline?: PipelineStage.Lookup['$lookup']['pipeline'];
}

export type ProjectUserNoteOutput<
  TField extends string,
  TCollaborativeDocumentPipeline = DBCollabText,
> = Omit<DBUserNote, 'userId' | 'note'> & {
  note: Omit<DBUserNote['note'], 'collabTexts'> & {
    collabTexts: Record<TField, TCollaborativeDocumentPipeline>;
  };
  lookupNote?: Omit<DBNote, 'publicId' | 'collabTexts'>;
};

export default function projectUserNote<TField extends string>({
  noteCollabTexts,
  collectionNames,
  collaborativeDocumentPipeline,
  lookupNote,
}: ProjectUserNoteInput<TField>): PipelineStage[] {
  return [
    {
      $unset: ['userId'],
    },
    ...Object.values(noteCollabTexts).flatMap((collabTextName) => [
      {
        $lookup: {
          from: collectionNames.collaborativeDocument,
          foreignField: '_id',
          localField: `note.collabTexts.${collabTextName}.collabTextId`,
          as: `note.collabTexts.${collabTextName}`,
          pipeline: collaborativeDocumentPipeline,
        },
      },
      {
        $set: {
          [`note.collabTexts.${collabTextName}`]: {
            $arrayElemAt: [`$note.collabTexts.${collabTextName}`, 0],
          },
        },
      },
    ]),
    ...(lookupNote
      ? [
          {
            $lookup: {
              from: collectionNames.note,
              foreignField: '_id',
              localField: 'note.id',
              as: 'note.lookupNote',
              pipeline: [
                {
                  $unset: ['_id', 'publicId', 'collabTexts'],
                },
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
