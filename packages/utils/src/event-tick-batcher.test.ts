/* eslint-disable @typescript-eslint/no-unsafe-return */
import { expect, it, vi } from 'vitest';

import { EventTickBatcher } from './event-tick-batcher';

it('batches promises in the same event loop', async () => {
  const batchFn = vi.fn().mockImplementation((keys) => keys);

  const batcher = new EventTickBatcher<string, string>(batchFn);

  void Promise.all([batcher.load('1'), batcher.load('2')]);

  await new Promise(process.nextTick.bind(process));

  expect(batchFn).toHaveBeenCalledWith(['1', '2']);
});
