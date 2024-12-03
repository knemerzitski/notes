import { renderHook } from '@testing-library/react';
import { afterAll, beforeAll, it, vi, expect } from 'vitest';

import { useSmoothOpen } from './useSmoothOpen';

beforeAll(() => {
  vi.useFakeTimers();
});

afterAll(() => {
  vi.useRealTimers();
});

// close after durationm

it('opened and closed during delay => never open', () => {
  const onExitedFn = vi.fn();

  const { result, rerender } = renderHook((open = false) =>
    useSmoothOpen(open as boolean, onExitedFn)
  );
  expect(result.current).toMatchInlineSnapshot(`
    {
      "delayStatus": "init",
      "open": false,
      "reset": [Function],
    }
  `);

  // Open during delay
  vi.advanceTimersByTime(25);
  rerender(true);
  expect(result.current).toMatchInlineSnapshot(`
    {
      "delayStatus": "in_progress",
      "open": false,
      "reset": [Function],
    }
  `);

  // Close during delay
  vi.advanceTimersByTime(25);
  rerender(false);
  expect(result.current).toMatchInlineSnapshot(`
    {
      "delayStatus": "in_progress",
      "open": false,
      "reset": [Function],
    }
  `);

  // Never opened, exit
  expect(onExitedFn.mock.calls).toMatchInlineSnapshot(`[]`);

  vi.runAllTimers();
  rerender(false);
  expect(result.current).toMatchInlineSnapshot(`
    {
      "delayStatus": "done",
      "open": false,
      "reset": [Function],
    }
  `);
  expect(onExitedFn.mock.calls).toMatchInlineSnapshot(`
    [
      [],
    ]
  `);
});

it('opened and during delay => open after delay', () => {
  const onExitedFn = vi.fn();

  const { result, rerender } = renderHook((open = false) =>
    useSmoothOpen(open as boolean, onExitedFn)
  );
  expect(result.current).toMatchInlineSnapshot(`
    {
      "delayStatus": "init",
      "open": false,
      "reset": [Function],
    }
  `);

  // Open during delay
  vi.advanceTimersByTime(25);
  rerender(true);
  expect(result.current).toMatchInlineSnapshot(`
    {
      "delayStatus": "in_progress",
      "open": false,
      "reset": [Function],
    }
  `);

  vi.runAllTimers();
  rerender(true);
  expect(result.current).toMatchInlineSnapshot(`
    {
      "delayStatus": "done",
      "open": true,
      "reset": [Function],
    }
  `);
  expect(onExitedFn.mock.calls).toMatchInlineSnapshot(`[]`);
});

it('close during duration => wait until duration is over', () => {
  const onExitedFn = vi.fn();

  const { result, rerender } = renderHook((open = false) =>
    useSmoothOpen(open as boolean, onExitedFn)
  );
  expect(result.current).toMatchInlineSnapshot(`
    {
      "delayStatus": "init",
      "open": false,
      "reset": [Function],
    }
  `);

  // Open during duration
  vi.advanceTimersByTime(150);
  rerender(true);
  expect(result.current).toMatchInlineSnapshot(`
    {
      "delayStatus": "done",
      "open": true,
      "reset": [Function],
    }
  `);

  // Close during duration
  vi.advanceTimersByTime(25);
  rerender(false);
  expect(result.current).toMatchInlineSnapshot(`
    {
      "delayStatus": "done",
      "open": true,
      "reset": [Function],
    }
  `);

  // Now closed after duration
  vi.runAllTimers();
  rerender(false);
  expect(result.current).toMatchInlineSnapshot(`
    {
      "delayStatus": "done",
      "open": false,
      "reset": [Function],
    }
  `);
  expect(onExitedFn.mock.calls).toMatchInlineSnapshot(`[]`);
});

it('close after during duration => close', () => {
  const onExitedFn = vi.fn();

  const { result, rerender } = renderHook((open = false) =>
    useSmoothOpen(open as boolean, onExitedFn)
  );
  expect(result.current).toMatchInlineSnapshot(`
    {
      "delayStatus": "init",
      "open": false,
      "reset": [Function],
    }
  `);

  // Open during duration
  vi.advanceTimersByTime(150);
  rerender(true);
  expect(result.current).toMatchInlineSnapshot(`
    {
      "delayStatus": "done",
      "open": true,
      "reset": [Function],
    }
  `);

  // Close during duration
  vi.advanceTimersByTime(500);
  rerender(false);
  expect(result.current).toMatchInlineSnapshot(`
    {
      "delayStatus": "done",
      "open": false,
      "reset": [Function],
    }
  `);
  expect(onExitedFn.mock.calls).toMatchInlineSnapshot(`[]`);
});
