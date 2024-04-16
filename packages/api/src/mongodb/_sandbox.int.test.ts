import { describe, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { Changeset } from '~collab/changeset/changeset';

import { NoteQueryMapper, NoteQuery } from '../graphql/note/mongo-query-mapper/note';

import util from 'util';
import { DeepQuery, mergeQueries } from './query-builder';

describe.skip('sandbox', () => {
  it('project', async () => {
    const projections: DeepQuery<NoteQuery>[] = [];

    const noteQuery = new NoteQueryMapper({
      queryDocument(project) {
        projections.push(project);
        console.log('project', util.inspect(project, false, null, true));
        return Promise.resolve({
          note: {
            _id: new ObjectId(),
            publicId: 'dsad',
            textFields: {
              CONTENT: {
                _id: new ObjectId(),
                headDocument: {
                  revision: 2,
                  changeset: Changeset.fromInsertion('a'),
                },
                tailDocument: {
                  revision: 1,
                  changeset: Changeset.fromInsertion('a'),
                },
                records: [
                  {
                    revision: 2,
                    changeset: Changeset.fromInsertion('b'),
                    creatorUserId: new ObjectId(),
                    userGeneratedId: 'be',
                    afterSelection: {
                      start: 1,
                    },
                    beforeSelection: {
                      start: 2,
                      end: 3,
                    },
                  },
                ],
              },
            },
            preferences: {
              backgroundColor: 'red',
            },
          },
        });
      },
    });

    const result = await noteQuery
      .textFields()[0]
      ?.value()
      .recordsConnection(
        {
          first: 3,
        },
        {
          maxLimit: 5,
        }
      )
      .edges()[0]
      ?.node()
      .change()
      .changeset();

    const result2 = await noteQuery
      .textFields()[0]
      ?.value()
      .recordsConnection(
        {
          first: 3,
        },
        {
          maxLimit: 5,
        }
      )
      .edges()[0]
      ?.node()
      .creatorUserId();

    const result3 = await noteQuery
      .textFields()[0]
      ?.value()
      .document({ revision: 10 })
      .changeset();

    const result4 = await noteQuery.preferences().backgroundColor();

    const finalQuery = mergeQueries({}, projections);

    console.log('MERGED');
    console.log(util.inspect(mergeQueries({}, projections), false, null, true));
  });
});
