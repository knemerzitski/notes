import { ObjectId } from 'mongodb';
import { Changeset } from '../../changeset/changeset';
import { RevisionChangeset, ServerRevisionRecord } from '../../records/record';

export type RevisionRecord = Omit<ServerRevisionRecord, 'creatorUserId'> & {
  creatorUserId: ObjectId;
};

export interface CollabText {
  headText: RevisionChangeset;
  tailText: RevisionChangeset;
  records: RevisionRecord[];
}

interface CreateNewTextParams {
  initalText: string;
  creatorUserId: ObjectId;
  userGeneratedId: string;
}

export function createInitialCollabText({
  initalText,
  creatorUserId,
  userGeneratedId,
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
