import { Document } from "mongodb";

export interface UserNoteLookupInput<TCollabTextKey extends string> {
  collabText?: CollabTextLookupInput<TCollabTextKey>;
  note?: NoteLookupInput;
  postLookup?: Document[];
}

export type UserNoteLookupOutput<
  TCollabTextKey extends string,
  TCollabText,
  TUserNote extends { note?: unknown },
  TNote,
> = Omit<TUserNote, 'userId' | 'note'> & {
  note?: Omit<TUserNote['note'], 'collabTextId'> & {
    collabText?: Partial<Record<TCollabTextKey, TCollabText>>;
  } & Omit<TNote, '_id' | 'publicId' | 'collabTextId'>;
};

export default function userNoteLookup<TCollabTextKey extends string>({
  collabText,
  note,
  postLookup,
}: UserNoteLookupInput<TCollabTextKey>) {
  return [
    {
      $unset: ['userId'],
    },
    ...(collabText ? noteCollabTextLookup(collabText) : []),
    ...(note ? noteLookup(note) : []),
    ...(postLookup ? postLookup : []),
  ];
}

interface CollabTextMapValue {
  pipeline?: Document[];
}

interface CollabTextLookupInput<TCollabTextKey extends string> {
  /**
   * CollabText collection name
   */
  collectionName: string;
  collabText: TCollabTextKey[] | Record<TCollabTextKey, CollabTextMapValue>;
}

function noteCollabTextLookup<TCollabTextKey extends string>({
  collectionName,
  collabText,
}: CollabTextLookupInput<TCollabTextKey>) {
  let collabTextKeys: TCollabTextKey[];
  let collabTextMap: Record<TCollabTextKey, CollabTextMapValue> | null;
  if (Array.isArray(collabText)) {
    collabTextKeys = collabText;
    collabTextMap = null;
  } else {
    collabTextKeys = Object.keys(collabText) as TCollabTextKey[];
    collabTextMap = collabText;
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
  pipeline?: Document[];
}

function noteLookup({ collectionName, pipeline = [] }: NoteLookupInput) {
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
