import { describe, expect, it, vi } from 'vitest';

import { EventBus } from './event-bus';

describe('EventBus', () => {
  it('calls handler on emit', () => {
    const bus = new EventBus();
    const handlerFn = vi.fn();

    bus.on('callme', handlerFn);

    expect(handlerFn).not.toHaveBeenCalled();
    bus.emit('callme');
    expect(handlerFn).toHaveBeenCalledOnce();
  });

  it('emits with payload', () => {
    const bus = new EventBus();
    const handlerFn = vi.fn();

    bus.on('payloaded', handlerFn);

    bus.emit('payloaded', 'example first');
    expect(handlerFn).toHaveBeenCalledWith('example first');
    bus.emit('payloaded', 'second');
    expect(handlerFn).toHaveBeenCalledWith('second');
  });

  it('calls multiple handlers', () => {
    const bus = new EventBus();
    const handlerFn = vi.fn();
    const handlerFn2 = vi.fn();

    bus.on('group', handlerFn);
    bus.on('group', handlerFn2);

    bus.emit('group');

    expect(handlerFn).toHaveBeenCalled();
    expect(handlerFn2).toHaveBeenCalledOnce();
  });

  it('* listens to all events and provides event name', () => {
    const bus = new EventBus();
    const handlerFn = vi.fn();

    bus.on('*', handlerFn);

    bus.emit('one');
    expect(handlerFn).toHaveBeenCalledWith('one', undefined);
    bus.emit('two', 'second');
    expect(handlerFn).toHaveBeenCalledWith('two', 'second');
  });

  it('off with handler removes only that handler', () => {
    const bus = new EventBus();
    const handlerFn = vi.fn();

    bus.on('delme', handlerFn);
    bus.on('other', handlerFn);
    bus.off('delme', handlerFn);

    bus.emit('delme');
    expect(handlerFn).not.toHaveBeenCalled();
    bus.emit('other');
    expect(handlerFn).toHaveBeenCalled();
  });

  it('off without handler removes all handlers with the name', () => {
    const bus = new EventBus();
    const handlerFn = vi.fn();
    const delFn = vi.fn();

    bus.on('one', delFn);
    bus.on('one', handlerFn);
    bus.off('one', delFn);

    bus.emit('one');
    expect(delFn).not.toHaveBeenCalled();
    expect(handlerFn).toHaveBeenCalled();
  });
});
