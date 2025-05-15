/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from '@faker-js/faker';

import { generateActions } from './generate-actions';
import { it } from 'vitest';

// Invoke actions in a random sequence to detect bugs
it('generated actions', () => {
  const gen = generateActions({
    collabSandboxOptions: {
      server: {
        recordsLimit: 500,
      },
      client: {
        service: {
          context: {
            historySizeLimit: 20,
          },
        },
      },
    },
    actionWeights: {
      setCaret: 40,
      insertText: 110,
      deleteText: 75,
      undo: 50,
      redo: 30,
      submitStep: 30,
    },
    clientWeights: {
      A: 6,
      B: 4,
    },
    insertLength: {
      min: 1,
      max: 9,
    },
    deleteCount: {
      min: 1,
      max: 6,
    },
    mergeProbability: 0.2,
    submitAcknowledgeFirstProbability: 0.5,
    submitStepWeights: {
      // How many steps in submissions are taken at once
      // submit => server receive => client ack => other clients external typing
      // count: weight
      1: 30,
      2: 18,
      3: 6,
      4: 2,
    },
  });

  faker.seed(1);

  gen.run(1000);
});
