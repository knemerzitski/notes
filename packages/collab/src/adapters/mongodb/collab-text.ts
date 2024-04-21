import { ObjectId } from 'mongodb';
import { Changeset } from '../../changeset/changeset';
import { RevisionChangeset, ServerRevisionRecord } from '../../records/record';

export type RevisionRecord<T = unknown> = Omit<
  ServerRevisionRecord<T>,
  'creatorUserId'
> & {
  creatorUserId: ObjectId;
};

export interface CollabText<T = unknown> {
  headText: RevisionChangeset<T>;
  tailText: RevisionChangeset<T>;
  records: RevisionRecord<T>[];
}

interface CreateNewTextParams {
  initalText: string;
  creatorUserId: ObjectId;
  userGeneratedId?: string;
}

export function createInitialCollabText({
  initalText,
  creatorUserId,
  userGeneratedId = '',
}: CreateNewTextParams): CollabText {
  const changeset = Changeset.fromInsertion(initalText);
  return {
    headText: {
      revision: 0,
      changeset,
    },
    tailText: {
      revision: -1,
      changeset: Changeset.EMPTY,
    },
    records: [
      {
        creatorUserId,
        userGeneratedId,
        revision: 0,
        changeset,
        beforeSelection: {
          start: 0,
        },
        afterSelection: {
          start: initalText.length,
        },
      },
    ],
  };
}
