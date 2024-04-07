import { PipelineStage, Require_id } from 'mongoose';
import { DBUserNote } from '../models/user-note';
import { DBNote } from '../models/note';
import { DBCollabText } from '../models/collab/collab-text';

export interface UserNotesArrayInput<TField extends string> {
  /**
   * Field path to array of UserNote._id
   */
  fieldPath: string;
  /**
   * Note textFields keys
   */
  noteTextFields: TField[];
  /**
   * Collection names for lookup
   */
  collectionNames: {
    userNote: string;
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
  /**
   * Array is unwind at the start and group back togeter at the end.
   */
  groupExpression?: Record<string, unknown>;
}

type UserNotesArrayItem<
  TField extends string,
  TCollaborativeDocumentPipeline = DBCollabText,
> = Require_id<
  Omit<DBUserNote, 'userId' | 'note'> & {
    note: Omit<DBUserNote['note'], 'textFields'> & {
      textFields: Record<TField, TCollaborativeDocumentPipeline>;
    };
    lookupNote?: Omit<DBNote, 'publicId' | 'textFields'>;
  }
>;

export interface UserNotesArrayOutput<
  TField extends string,
  TCollaborativeDocumentPipeline = DBCollabText,
> {
  userNotes: UserNotesArrayItem<TField, TCollaborativeDocumentPipeline>[];
}

export default function userNotesArray<TField extends string>({
  fieldPath,
  noteTextFields,
  collectionNames,
  lookupNote,
  collaborativeDocumentPipeline = [],
  groupExpression,
}: UserNotesArrayInput<TField>): PipelineStage[] {
  return [
    {
      $unwind: {
        path: `$${fieldPath}`,
        includeArrayIndex: 'index',
      },
    },
    { // TODO separate below for a single usernote.???
      $lookup: {
        from: collectionNames.userNote,
        foreignField: '_id',
        localField: fieldPath,
        as: 'userNote',
        pipeline: [
          {
            $unset: ['userId'],
          },
          ...Object.values(noteTextFields).flatMap((textFieldName) => [
            {
              $lookup: {
                from: collectionNames.collaborativeDocument,
                foreignField: '_id',
                localField: `note.textFields.${textFieldName}.collabId`,
                as: `note.textFields.${textFieldName}`,
                pipeline: collaborativeDocumentPipeline,
              },
            },
            {
              $set: {
                [`note.textFields.${textFieldName}`]: {
                  $arrayElemAt: [`$note.textFields.${textFieldName}`, 0],
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
                        $unset: ['_id', 'publicId', 'textFields'],
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
        ],
      },
    },
    {
      $set: {
        userNote: { $arrayElemAt: ['$userNote', 0] },
      },
    },
    {
      $group: {
        ...groupExpression,
        _id: '$_id',
        userNotes: { $push: '$userNote' },
      },
    },
    { $unset: ['_id'] },
  ];
}
