import { ObjectId } from 'mongodb';
import { UserModel } from '../../mongoose/models/user';
import DataLoader from 'dataloader';
import { DBUserNote } from '../../mongoose/models/user-note';
import { DBNote } from '../../mongoose/models/note';
import { PipelineStage } from 'mongoose';

interface UserNotesDataSourceKey {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

type UserNoteNoIds = Omit<DBUserNote, 'userId' | 'note'>;
// type NoteWithCollabDocs = Omit<DBNote, 'textFields'> & {textFields: Record<string,>};

// const s: UserNoteNoIds;

interface AggregateUserNotes {
  userNotes: string;
  firstId?: ObjectId;
  lastId?: ObjectId;
}

export class UserNotesDataSource {
  private userId: ObjectId;
  private Model: UserModel;

  constructor(Model: UserModel, userId: ObjectId) {
    this.Model = Model;
    this.userId = userId;
  }

  private loader = new DataLoader(async (requestedKeys) => {


    
  });
}

export class UserNoteDataSource {
  readonly id: ObjectId;
}

export function lookupNotes({
  userNoteArrayFieldPath,
  textFieldNames,
  userNoteCollectionName,
  noteCollectionName,
  collabDocumentCollectionName,
}: {
  userNoteArrayFieldPath: string;
  textFieldNames: string[];
  userNoteCollectionName: string;
  noteCollectionName: string;
  collabDocumentCollectionName: string;
}): PipelineStage[] {
  return [
    {
      $unwind: {
        path: `$${userNoteArrayFieldPath}`,
        includeArrayIndex: 'index',
      },
    },
    {
      $lookup: {
        from: userNoteCollectionName,
        foreignField: '_id',
        localField: userNoteArrayFieldPath,
        as: 'userNote',
        pipeline: [
          {
            $unset: ['userId'],
          },
          ...Object.values(textFieldNames).flatMap((textFieldName) => [
            {
              $lookup: {
                from: collabDocumentCollectionName,
                foreignField: '_id',
                localField: `note.textFields.${textFieldName}.collabId`,
                as: `note.textFields.${textFieldName}`,
              },
              // pipeline: [
              //    TODO INJECT collaborativedocument query here for specific field...
              // ],
            },
            {
              $set: {
                [`note.textFields.${textFieldName}`]: {
                  $arrayElemAt: [`$note.textFields.${textFieldName}`, 0],
                },
              },
            },
          ]),
          // // START only if want ownerId,
          {
            $lookup: {
              from: noteCollectionName,
              foreignField: '_id',
              localField: 'note.id',
              as: 'note.lookupNote',
              pipeline: [
                {
                  $unset: ['publicId', 'textFields'],
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
          // END only if want ownerId
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
        _id: '$_id',
        // firstId: { $first: '$firstId' },
        // lastId: { $first: '$lastId' },
        userNotes: { $push: '$userNote' },
      },
    },
    { $unset: ['_id'] },
  ];
}

/*
{ ...
  order: [_id,_id]
}
=>
...
{ ...
  order: _id
},
=>
...
{ ...
  order: _id
  userNote: {
    ...
  }
},

*/
