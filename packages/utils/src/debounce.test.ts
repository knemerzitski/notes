import { afterEach, beforeAll, expect, it, vi } from 'vitest';

import { Debounce } from './debounce';

beforeAll(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
});

it('invokes exactly when wait has elapsed', () => {
  const callbackSpy = vi.fn();

  const debounce = new Debounce(callbackSpy, {
    wait: 300,
  });

  debounce.invoke();

  vi.advanceTimersByTime(299);
  expect(callbackSpy).not.toHaveBeenCalledOnce();
  vi.advanceTimersByTime(1);
  expect(callbackSpy).toHaveBeenCalledOnce();
});

it('invoke restarts timer', () => {
  const callbackSpy = vi.fn();

  const debounce = new Debounce(callbackSpy, {
    wait: 300,
  });

  debounce.invoke();
  vi.advanceTimersByTime(250);
  debounce.invoke();
  vi.advanceTimersByTime(100);
  expect(callbackSpy).not.toHaveBeenCalledOnce();

  vi.advanceTimersByTime(200);
  expect(callbackSpy).toHaveBeenCalledOnce();
});

it('flush runs callback when invoked', () => {
  const callbackSpy = vi.fn();

  const debounce = new Debounce(callbackSpy, {
    wait: 300,
  });

  debounce.invoke();
  debounce.flush();
  expect(callbackSpy).toHaveBeenCalledOnce();
});

it('flush does not run callback when not invoked', () => {
  const callbackSpy = vi.fn();

  const debounce = new Debounce(callbackSpy, {
    wait: 300,
  });

  debounce.flush();
  vi.runAllTimers();
  expect(callbackSpy).not.toHaveBeenCalledOnce();
});

it('clears', () => {
  const callbackSpy = vi.fn();

  const debounce = new Debounce(callbackSpy, {
    wait: 300,
  });

  debounce.invoke();
  debounce.cancel();
  vi.runAllTimers();
  expect(callbackSpy).not.toHaveBeenCalledOnce();
});

it('isPending', () => {
  const callbackSpy = vi.fn();

  const debounce = new Debounce(callbackSpy, {
    wait: 300,
  });

  debounce.flush();
  vi.runAllTimers();
  expect(callbackSpy).not.toHaveBeenCalledOnce();
});

it('isPending', () => {
  const callbackSpy = vi.fn();

  const debounce = new Debounce(callbackSpy, {
    wait: 300,
  });

  expect(debounce.isPending()).toBeFalsy();
  debounce.invoke();
  expect(debounce.isPending()).toBeTruthy();
  vi.runAllTimers();
  expect(debounce.isPending()).toBeFalsy();
});

it('maxWait runs callback even when invoke resets timer', () => {
  const callbackSpy = vi.fn();

  const debounce = new Debounce(callbackSpy, {
    wait: 300,
    maxWait: 600,
  });

  debounce.invoke();
  vi.advanceTimersByTime(250);
  expect(callbackSpy).not.toHaveBeenCalledOnce();

  debounce.invoke();
  // 500
  vi.advanceTimersByTime(250);
  expect(callbackSpy).not.toHaveBeenCalledOnce();

  debounce.invoke();
  // 750
  vi.advanceTimersByTime(250);
  expect(callbackSpy).toHaveBeenCalledOnce();
});
