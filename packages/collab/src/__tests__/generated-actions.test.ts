import { faker } from '@faker-js/faker';

import { it } from 'vitest';

import { generateActions } from './generate-actions';

// Invoke actions in a random sequence to detect bugs
it('generated actions', () => {
  const gen = generateActions({
    collabSandboxOptions: {
      clients: ['A', 'B'],
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
    clientWeights: {
      A: 6,
      B: 4,
    },
    actionWeights: {
      setCaret: 40,
      insertText: 110,
      deleteText: 75,
      undo: 50,
      redo: 30,
      reset: 1,
      submitStep: 30,
    },
    insert: [
      {
        weight: 1,
        value: {
          type: 'word',
          value: {
            min: 1,
            max: 9,
          },
        },
      },
    ],
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

it('generated actions with json fields', () => {
  const gen = generateActions({
    collabSandboxOptions: {
      server: {
        recordsLimit: 500,
      },
    },
    clientWeights: {
      A: 6,
      B: 4,
    },
    actionWeights: {
      fieldSetCaret: 40,
      fieldInsertText: 100,
      fieldDeleteText: 75,
      undo: 50,
      redo: 30,
      reset: 1,
      submitStep: 30,
    },
    fieldWeights: {
      title: 1,
      content: 3,
    },
    insert: [
      {
        weight: 10,
        value: {
          type: 'word',
          value: {
            min: 2,
            max: 6,
          },
        },
      },
      {
        weight: 10,
        value: {
          type: 'custom',
          value: '"',
        },
      },
      {
        weight: 15,
        value: {
          type: 'custom',
          value: '\n',
        },
      },
    ],
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

  const clientOptions: Parameters<
    typeof gen.context.collabSandbox.server.createClient
  >[1] = {
    service: {
      context: {
        historySizeLimit: 20,
      },
    },
    jsonTyper: {
      fieldNames: ['title', 'content'],
    },
  };

  const A = gen.context.collabSandbox.server.createClient('A', clientOptions);
  A.submitChangesInstant();

  gen.context.collabSandbox.server.createClient('B', clientOptions);

  faker.seed(2);
  gen.run(1000);
});
