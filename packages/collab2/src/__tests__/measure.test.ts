import { it } from 'vitest';

import { createCollabSandbox } from './helpers/collab-sandbox';

it.skip('measure increasing records count execution time', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    server: {
      recordsLimit: 50,
    },
    clients: ['A', 'B'],
    client: {
      service: {
        context: {
          historySizeLimit: 20,
        },
      },
    },
  });

  const cycles = 40;
  const perCycle = 100;
  console.time('measure:total');
  for (let k = 0; k < cycles; k++) {
    console.time(`measure:${k}`);
    for (let i = 0; i < perCycle; i++) {
      A.insert(String(i));
      A.submitChangesInstant();
    }
    console.timeEnd(`measure:${k}`);
  }
  console.timeEnd('measure:total');
});
