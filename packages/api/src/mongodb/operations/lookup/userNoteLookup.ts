import { Document } from 'mongodb';

export interface UserNoteLookupInput<TCollabTextKey extends string> {
  collabText?: CollabTextLookupInput<TCollabTextKey>;
  note?: NoteLookupInput;
  shareNoteLink?: ShareNoteLinkLookupInput;
  postLookup?: Document[];
}

export type UserNoteLookupOutput<
  TCollabTextKey extends string,
  TCollabText,
  TUserNote extends { note?: unknown },
  TNote,
  TShareNoteLink = unknown,
> = Omit<TUserNote, 'userId' | 'note'> & {
  note?: Omit<TUserNote['note'], 'collabTextIds'> & {
    collabTexts?: Partial<Record<TCollabTextKey, TCollabText>>;
  } & Omit<TNote, '_id' | 'publicId' | 'collabTextIds'>;
  shareNoteLinks: TShareNoteLink[];
};

export default function userNoteLookup<TCollabTextKey extends string>({
  collabText,
  note,
  shareNoteLink,
  postLookup,
}: UserNoteLookupInput<TCollabTextKey>) {
  return [
    {
      $unset: ['userId'],
    },
    ...(collabText ? noteCollabTextLookup(collabText) : []),
    ...(note ? noteLookup(note) : []),
    ...(shareNoteLink ? shareNoteLinkLookup(shareNoteLink) : []),
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
  collabTexts: TCollabTextKey[] | Record<TCollabTextKey, CollabTextMapValue>;
}

function noteCollabTextLookup<TCollabTextKey extends string>({
  collectionName,
  collabTexts,
}: CollabTextLookupInput<TCollabTextKey>) {
  let collabTextKeys: TCollabTextKey[];
  let collabTextMap: Record<TCollabTextKey, CollabTextMapValue> | null;
  if (Array.isArray(collabTexts)) {
    collabTextKeys = collabTexts;
    collabTextMap = null;
  } else {
    collabTextKeys = Object.keys(collabTexts) as TCollabTextKey[];
    collabTextMap = collabTexts;
  }

  return [
    ...collabTextKeys.flatMap((collabTextKey) => [
      {
        $lookup: {
          from: collectionName,
          foreignField: '_id',
          localField: `note.collabTextIds.${collabTextKey}`,
          as: `note.collabTexts.${collabTextKey}`,
          pipeline: collabTextMap?.[collabTextKey].pipeline ?? [],
        },
      },
      {
        $set: {
          [`note.collabTexts.${collabTextKey}`]: {
            $arrayElemAt: [`$note.collabTexts.${collabTextKey}`, 0],
          },
        },
      },
    ]),
    ...(collabTextKeys.length > 0 ? [{ $unset: ['note.collabTextIds'] }] : []),
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
            $unset: ['_id', 'publicId', 'collabTextIds'],
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

interface ShareNoteLinkLookupInput {
  /**
   * ShareNoteLink collection name
   */
  collectionName: string;
  pipeline?: Document[];
}

function shareNoteLinkLookup({
  collectionName,
  pipeline = [],
}: ShareNoteLinkLookupInput) {
  return [
    {
      $lookup: {
        from: collectionName,
        foreignField: 'sourceUserNote.id',
        localField: '_id',
        as: 'shareNoteLinks',
        pipeline: [
          {
            $unset: ['note', 'sourceUserNote'],
          },
          ...pipeline,
        ],
      },
    },
  ];
}
