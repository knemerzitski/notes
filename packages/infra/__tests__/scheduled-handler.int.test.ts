/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { spawn } from 'node:child_process';

import { faker } from '@faker-js/faker';
import { beforeEach, expect, it } from 'vitest';
import { resetDatabase } from '~api/__tests__/helpers/mongodb/mongodb';
import { TestNoteCategory } from '~api/__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '~api/__tests__/helpers/mongodb/populate/populate-queue';
import { generateTrashedNotes } from '~api/__tests__/helpers/mongodb/populate/trashed-notes';
import { createDeferred } from '~utils/deferred';

beforeEach(async () => {
  faker.seed(43432);
  await resetDatabase();

  generateTrashedNotes({
    trashCategory: TestNoteCategory.OTHER,
    nUsers: 10,
    nNotes: 500,
    trashedChance: 0.97,
    expiredChance: 0.8,
    otherUserOwnerChance: 0.02,
    sharedChanceTable: {
      0.05: 5,
      0.2: 2,
      0.4: 1,
      1: 0,
    },
  });
  await populateExecuteAll();
});

it(
  'invokes scheduled handler without errors',
  {
    timeout: 20000,
  },
  async () => {
    const lambdaProcess = spawn(
      'sam',
      [
        'local',
        'invoke',
        'ScheduledFnB0AA6235',
        '--docker-network',
        'sam-api-network',
        '-t',
        'cdk.out/test/scheduled/TESTINGONLYScheduledHandlerStack.template.json',
      ],
      {
        env: Object.fromEntries(
          Object.entries(process.env).filter(
            ([key, _value]) =>
              // Do not inherit MONGODB_URI as it needs to be set in lambda
              !['MONGODB_URI'].includes(key)
          )
        ),
      }
    );

    let firstErrorData: unknown;

    const consoleLogs: string[] = [];

    lambdaProcess.stdout.on('data', function (data) {
      consoleLogs.push(String(data));
      const obj = JSON.parse(data);
      if (!firstErrorData && obj.errorType === 'Error') {
        firstErrorData = obj;
      }
    });

    lambdaProcess.stderr.on('data', function (data) {
      consoleLogs.push(String(data));
    });

    const deferred = createDeferred<number | null>();
    lambdaProcess.on('close', function (code) {
      deferred.resolve(code);
    });

    const lambdaCloseCode = await deferred.promise;

    if (firstErrorData != null) {
      consoleLogs.forEach((msg) => {
        console.log(msg);
      });
    }

    expect(lambdaCloseCode).toStrictEqual(0);
    expect(firstErrorData, JSON.stringify(firstErrorData, null, 2)).toBeUndefined();
  }
);
