import { beforeEach, describe, expect, it, vi } from 'vitest';

import filter, { Filter, FiltersHandlerMap } from '.';

describe('index', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  type Events = {
    str: string;
    nr: number;
    anything: unknown;
  };

  let events: FiltersHandlerMap<Events>;
  let filterBus: Filter<Events>;

  beforeEach(() => {
    events = new Map();
    filterBus = filter(events);
  });

  describe('filter', () => {
    it('calls handler with given value', () => {
      const handler = vi.fn();
      filterBus.on('str', handler);
      filterBus.filter('str', 'hi');
      expect(handler).toHaveBeenCalledWith('hi');
    });

    it('returns value from handler', () => {
      const handler = vi.fn();
      handler.mockReturnValueOnce('result here');
      filterBus.on('str', handler);
      const result = filterBus.filter('str', 'hi');
      expect(result).toStrictEqual('result here');
    });

    it('calls handlers in insertion order', () => {
      const handler1 = vi.fn();
      handler1.mockReturnValueOnce('ret 1');

      const handler2 = vi.fn();
      handler2.mockReturnValueOnce('ret 2');

      const handler3 = vi.fn();
      handler3.mockReturnValueOnce('ret 3');

      filterBus.on('str', handler1);
      filterBus.on('str', handler2);
      filterBus.on('str', handler3);

      const result = filterBus.filter('str', 'first');

      expect(handler1).toHaveBeenCalledWith('first');
      expect(handler2).toHaveBeenCalledWith('ret 1');
      expect(handler3).toHaveBeenCalledWith('ret 2');
      expect(result).toStrictEqual('ret 3');
    });

    it('calls handlers from all map by type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const otherHandler1 = vi.fn();
      filterBus.all.set('nr', [handler1, handler2]);
      filterBus.all.set('str', [otherHandler1]);

      filterBus.filter('nr', 1);
      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(otherHandler1).not.toHaveBeenCalledOnce();
    });
  });

  describe('on', () => {
    it('adds handler to the end of existing list', () => {
      const handler = vi.fn();
      filterBus.all.set('anything', [vi.fn()]);
      filterBus.on('anything', handler);
      expect(filterBus.all.get('anything')?.[1]).toStrictEqual(handler);
    });

    it('creates a new list as needed', () => {
      const handler = vi.fn();
      filterBus.on('anything', handler);
      expect(filterBus.all.get('anything')?.[0]).toStrictEqual(handler);
    });
  });

  describe('off', () => {
    it('removes all handlers if handler is not specified', () => {
      filterBus.all.set('anything', [vi.fn(), vi.fn()]);
      filterBus.all.set('nr', [vi.fn()]);
      filterBus.off('anything');
      expect(filterBus.all.get('anything')).toHaveLength(0);
      expect(filterBus.all.get('nr')).toHaveLength(1);
    });

    it('removes only specific handler in argument', () => {
      const before = vi.fn();
      const handler = vi.fn();
      const after = vi.fn();
      filterBus.all.set('anything', [before, handler, after]);
      filterBus.off('anything', handler);
      expect(filterBus.all.get('anything')).toStrictEqual([before, after]);
    });
  });
});
