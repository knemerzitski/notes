import { gql, InMemoryCache } from '@apollo/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { CacheEvictionTracker } from './eviction-tracker';

function nextTick() {
  return new Promise(process.nextTick.bind(process));
}

let tracker: CacheEvictionTracker;
let cache: InMemoryCache;
const callbackSpy = vi.fn();

const typename = 'MyObject';
const id = '3';

function addObjectToCache() {
  cache.writeFragment({
    fragment: gql(`
      fragment TestEvictionTracker on MyObject {
        id
      }
    `),
    data: {
      __typename: typename,
      id,
    },
  });
}

function track(options?: Parameters<CacheEvictionTracker['track']>[2]) {
  return tracker.track(
    {
      __typename: typename,
      id,
    },
    callbackSpy,
    options
  );
}

beforeEach(() => {
  cache = new InMemoryCache({
    gcExplicitWrites: true,
  });
  tracker = new CacheEvictionTracker(cache);
});

afterEach(() => {
  callbackSpy.mockClear();
});

it('does not invoke callback on same tick', () => {
  track();

  expect(callbackSpy).not.toHaveBeenCalled();
});

it('invokes callback when object is not in cache', async () => {
  track();

  await nextTick();
  expect(callbackSpy).toHaveBeenCalledOnce();
});

it('does not invoke callback when object is in cache', async () => {
  addObjectToCache();
  track();

  await nextTick();
  expect(callbackSpy).not.toHaveBeenCalled();
});

it('invokes callback immediately on gc', () => {
  addObjectToCache();
  track();

  cache.gc();
  expect(callbackSpy).toHaveBeenCalled();
});

it('invokes callback multiple times when object is readded and evicted', () => {
  addObjectToCache();
  track();

  cache.gc();
  expect(callbackSpy).toHaveBeenCalledOnce();

  addObjectToCache();
  cache.gc();
  expect(callbackSpy).toHaveBeenCalledTimes(2);
});

it('stopOnEvicted=true, invokes callback once even when object is readded and evicted', () => {
  addObjectToCache();
  track({
    stopOnEvicted: true,
  });

  cache.gc();
  expect(callbackSpy).toHaveBeenCalledOnce();

  addObjectToCache();
  cache.gc();
  expect(callbackSpy).toHaveBeenCalledOnce();
});
