import { it, expect, beforeAll, describe } from 'vitest';
import {
  createCollaborativeDocument,
  createUser,
  populateWithCreatedData,
} from '../../test/helpers/mongoose/populate';
import projectCollaborativeDocument, {
  ProjectCollaborativeDocumentInput,
  ProjectCollaborativeDocumentOutput,
} from './_projectCollaborativeDocument';
import { UserDocument } from '../models/user';
import { CollabTextDocument } from '../models/collab/collab-text';
import { CollaborativeDocument, resetDatabase } from '../../tests/helpers/mongoose';
import { faker } from '@faker-js/faker';

let user: UserDocument;
let collaborativeDocument: CollabTextDocument;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(3256);

  user = createUser();
  collaborativeDocument = createCollaborativeDocument(user, {
    tailRevision: -1,
    recordsCount: 10,
  });

  await populateWithCreatedData();
});

async function aggregateProjection(input: ProjectCollaborativeDocumentInput) {
  return (
    await CollaborativeDocument.aggregate<ProjectCollaborativeDocumentOutput>([
      {
        $match: {
          _id: collaborativeDocument._id,
        },
      },
      {
        $project: {
          _id: 0,
          ...projectCollaborativeDocument(input),
        },
      },
    ])
  )[0];
}

it.each<
  [
    string,
    ProjectCollaborativeDocumentInput,
    Partial<ProjectCollaborativeDocumentOutput>,
  ]
>([
  [
    'projects only headDocument',
    { headDocument: true },
    {
      headDocument: {
        changeset: ['head'],
        revision: 9,
      },
    },
  ],
  [
    'projects only tailDocument',
    { tailDocument: true },
    {
      tailDocument: {
        changeset: [],
        revision: -1,
      },
    },
  ],
])('%s', async (_msg, input, expectedOutput) => {
  const result = await aggregateProjection(input);
  expect(result).toStrictEqual(expectedOutput);
});

describe('project records, 10 total records', () => {
  it('returns recordsMeta', async () => {
    const result = await aggregateProjection({
      records: {},
    });
    expect(result?.recordsMeta).toStrictEqual({
      tailDocumentRevision: -1,
      recordsSize: 10,
    });
  });

  it.each<[ProjectCollaborativeDocumentInput['records'], number[]]>([
    [
      {
        start: {
          forward: 3,
        },
        end: {
          forward: 7,
        },
      },
      [3, 4, 5, 6],
    ],
    [
      {
        start: {
          backward: -3,
        },
        end: {
          backward: -1,
        },
      },
      [7, 8, 9],
    ],
    [
      {
        startRevision: 2,
        endRevision: 5,
      },
      [2, 3, 4, 5],
    ],
    [
      {
        endRevision: 3,
      },
      [0, 1, 2, 3],
    ],
    [
      {
        startRevision: 7,
      },
      [7, 8, 9],
    ],
    [
      {
        start: {
          forward: 3,
          backward: -6,
        },
        startRevision: 2,
        end: {
          forward: 7,
          backward: -5,
        },
        endRevision: 7,
      },
      [2, 3, 4, 5, 6, 7],
    ],
    [
      {
        start: {
          forward: 3,
          backward: -6,
        },
        startRevision: 4,
        end: {
          forward: 7,
          backward: -5,
        },
        endRevision: 5,
      },
      [3, 4, 5, 6],
    ],
  ])('%s => %s', async (input, expectedOutput) => {
    const result = await aggregateProjection({ records: input });
    expect(result?.records?.map((record) => record.change.revision)).toStrictEqual(
      expectedOutput
    );
  });
});
