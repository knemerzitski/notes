import { describe, expect, it, vi } from 'vitest';
import { memoize1, memoize1Plain } from './memoize1';

describe('memoize1Plain', () => {
  it('memos number', () => {
    const double = vi.fn().mockImplementation((a: number) => a * 2);

    const memoDouble = memoize1Plain(double);

    expect(memoDouble(2)).toStrictEqual(4);
    expect(memoDouble(2)).toStrictEqual(4);
    expect(double.mock.calls).toStrictEqual([[2]]);

    expect(memoDouble(3)).toStrictEqual(6);
    expect(double.mock.calls).toStrictEqual([[2], [3]]);
    expect(memoDouble(3)).toStrictEqual(6);
    expect(double.mock.calls).toStrictEqual([[2], [3]]);
  });

  it('memos same object', () => {
    const idt = vi.fn().mockImplementation((a: unknown) => a);

    const memoIdt = memoize1Plain(idt);

    const obj = {};
    expect(memoIdt(obj)).toStrictEqual(obj);
    expect(memoIdt(obj)).toStrictEqual(obj);
    expect(idt.mock.calls).toStrictEqual([[obj]]);
  });
});

describe('memoize1', () => {
  it('memos same object', () => {
    const idt = vi.fn().mockImplementation((a: unknown) => a);

    const memoIdt = memoize1(idt);

    const obj = {};
    expect(memoIdt(obj)).toStrictEqual(obj);
    expect(memoIdt(obj)).toStrictEqual(obj);
    expect(idt.mock.calls).toStrictEqual([[obj]]);
  });
});
