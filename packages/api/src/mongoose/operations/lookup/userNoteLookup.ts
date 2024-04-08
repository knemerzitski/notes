import { PipelineStage } from 'mongoose';
import { DBCollabText } from '../../models/collab/collab-text';
import { DBNote } from '../../models/note';
import { DBUserNote } from '../../models/user-note';

export interface UserNoteLookupInput<TCollabTextKey extends string> {
  collabText?: CollabTextLookupInput<TCollabTextKey>;
  note?: NoteLookupInput;
}

type BaseUserNote = Omit<DBUserNote, 'userId' | 'note'>;
type BaseUserNoteNote = Omit<DBUserNote['note'], 'collabTextId'>;
type DefaultNotePipeline = Omit<DBNote, 'userId' | 'publicId' | 'collabTextId'>;
type DefaultCollabTextPipeline = DBCollabText;

export type UserNoteLookupOutput<
  TCollabTextKey extends string,
  TCollabTextPipeline = DefaultCollabTextPipeline,
  TNotePipeline = DefaultNotePipeline,
> = UserNoteLookupOnlyCollabTextOutput<TCollabTextKey, TCollabTextPipeline> &
  UserNoteLookupOnlyNoteOutput<TNotePipeline>;

export type UserNoteLookupOnlyCollabTextOutput<
  TCollabTextKey extends string,
  Pipeline = DefaultCollabTextPipeline,
> = BaseUserNote & {
  note: BaseUserNoteNote & {
    collabText: Record<TCollabTextKey, Pipeline>;
  };
};

export type UserNoteLookupOnlyNoteOutput<Pipeline = DefaultNotePipeline> =
  BaseUserNote & {
    note: BaseUserNoteNote & Pipeline;
  };

export default function userNoteLookup<TCollabTextKey extends string>({
  collabText,
  note,
}: UserNoteLookupInput<TCollabTextKey>): Exclude<
  PipelineStage.Lookup['$lookup']['pipeline'],
  undefined
> {
  return [
    {
      $unset: ['userId'],
    },
    ...(collabText ? noteCollabTextLookup(collabText) : []),
    ...(note ? noteLookup(note) : []),
  ];
}

interface CollabTextMapValue {
  pipeline?: PipelineStage.Lookup['$lookup']['pipeline'];
}

interface CollabTextLookupInput<TCollabTextKey extends string> {
  /**
   * CollabText collection name
   */
  collectionName: string;
  keys: TCollabTextKey[] | Record<TCollabTextKey, CollabTextMapValue>;
}

function noteCollabTextLookup<TCollabTextKey extends string>({
  collectionName,
  keys,
}: CollabTextLookupInput<TCollabTextKey>): Exclude<
  PipelineStage.Lookup['$lookup']['pipeline'],
  undefined
> {
  let collabTextKeys: TCollabTextKey[];
  let collabTextMap: Record<TCollabTextKey, CollabTextMapValue> | null;
  if (Array.isArray(keys)) {
    collabTextKeys = keys;
    collabTextMap = null;
  } else {
    collabTextKeys = Object.keys(keys) as TCollabTextKey[];
    collabTextMap = keys;
  }

  return [
    ...collabTextKeys.flatMap((collabTextKey) => [
      {
        $lookup: {
          from: collectionName,
          foreignField: '_id',
          localField: `note.collabTextId.${collabTextKey}`,
          as: `note.collabText.${collabTextKey}`,
          pipeline: collabTextMap?.[collabTextKey].pipeline ?? [],
        },
      },
      {
        $set: {
          [`note.collabText.${collabTextKey}`]: {
            $arrayElemAt: [`$note.collabText.${collabTextKey}`, 0],
          },
        },
      },
    ]),
    ...(collabTextKeys.length > 0 ? [{ $unset: ['note.collabTextId'] }] : []),
  ];
}

interface NoteLookupInput {
  /**
   * Note collection name
   */
  collectionName: string;
  pipeline?: PipelineStage.Lookup['$lookup']['pipeline'];
}

function noteLookup({
  collectionName,
  pipeline = [],
}: NoteLookupInput): Exclude<PipelineStage.Lookup['$lookup']['pipeline'], undefined> {
  return [
    {
      $lookup: {
        from: collectionName,
        foreignField: '_id',
        localField: 'note.id',
        as: 'note._lookup',
        pipeline: [
          {
            $unset: ['_id', 'publicId', 'collabTextId'],
          },
          ...pipeline,
        ],
      },
    },
    {
      $set: {
        note: {
          $mergeObjects: [
            '$note',
            {
              $arrayElemAt: ['$note._lookup', 0],
            },
          ],
        },
      },
    },
    {
      $unset: ['note._lookup'],
    },
  ];
}
