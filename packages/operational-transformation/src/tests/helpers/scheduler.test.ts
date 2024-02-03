import { describe, expect, it, vi } from 'vitest';

import { Scheduler } from './scheduler';

describe('Scheduler', () => {
  it('invokes added task when run is called', () => {
    const scheduler = new Scheduler();

    const taskFn = vi.fn();

    scheduler.add(0, taskFn);

    expect(taskFn).not.toHaveBeenCalled();
    scheduler.run();
    expect(taskFn).toHaveBeenCalledOnce();
  });

  it('invokes task only after specified delay has passed', () => {
    const scheduler = new Scheduler();

    const taskFn = vi.fn();

    scheduler.add(100, taskFn);

    expect(taskFn).not.toHaveBeenCalled();
    scheduler.run(50);
    expect(taskFn).not.toHaveBeenCalled();
    scheduler.run(49);
    expect(taskFn).not.toHaveBeenCalled();
    scheduler.run(1);
    expect(taskFn).toHaveBeenCalledOnce();
  });

  it('invokes tasks in order: earlier to older', () => {
    const scheduler = new Scheduler();

    const actualCallOrder: string[] = [];

    const earlyFn = vi.fn().mockImplementationOnce(() => actualCallOrder.push('early'));
    const midFn = vi.fn().mockImplementationOnce(() => actualCallOrder.push('mid'));
    const laterFn = vi.fn().mockImplementationOnce(() => actualCallOrder.push('later'));

    scheduler.add(200, midFn);
    scheduler.add(300, laterFn);
    scheduler.add(100, earlyFn);

    scheduler.run(300);
    expect(actualCallOrder).toStrictEqual(['early', 'mid', 'later']);
  });

  it('runs all tasks that are within run time', () => {
    const scheduler = new Scheduler();

    const at1600Fn = vi.fn();
    const at600Fn = vi.fn().mockImplementationOnce(() => {
      scheduler.add(1000, at1600Fn);
    });
    const at100Fn = vi.fn().mockImplementationOnce(() => {
      scheduler.add(500, at600Fn);
    });

    scheduler.add(100, at100Fn);

    scheduler.run(600);
    expect(at100Fn).toHaveBeenCalledOnce();
    expect(at600Fn).toHaveBeenCalledOnce();
    expect(at1600Fn).not.toHaveBeenCalledOnce();
  });

  it('run() invokes all tasks', () => {
    const scheduler = new Scheduler();

    const deepFn = vi.fn();
    const innerFn = vi.fn().mockImplementationOnce(() => {
      scheduler.add(1000, deepFn);
    });
    const rootFn = vi.fn().mockImplementationOnce(() => {
      scheduler.add(100, innerFn);
    });

    scheduler.add(0, rootFn);

    scheduler.run();

    expect(rootFn).toHaveBeenCalledOnce();
    expect(innerFn).toHaveBeenCalledOnce();
    expect(deepFn).toHaveBeenCalledOnce();
  });

  it('invokes task sequentially according to time when they are added', () => {
    const scheduler = new Scheduler();

    const deepFn = vi.fn();
    const innerFn = vi.fn().mockImplementationOnce(() => {
      scheduler.add(1000, deepFn);
    });
    const rootFn = vi.fn().mockImplementationOnce(() => {
      scheduler.add(100, innerFn);
    });

    scheduler.add(0, rootFn);
    scheduler.run(0);
    expect(rootFn).toHaveBeenCalledOnce();
    expect(innerFn).not.toHaveBeenCalledOnce();
    scheduler.run(100);
    expect(innerFn).toHaveBeenCalledOnce();
    expect(deepFn).not.toHaveBeenCalledOnce();
    scheduler.run(1000);
    expect(deepFn).toHaveBeenCalledOnce();
  });

  it('autoRuns', () => {
    const scheduler = new Scheduler();

    const taskFn = vi.fn();

    scheduler.autoRun = true;
    scheduler.add(0, taskFn);
    expect(taskFn).toHaveBeenCalledOnce();

    scheduler.autoRun = false;
    scheduler.add(0, taskFn);
    expect(taskFn).toHaveBeenCalledOnce();
    scheduler.run();
    expect(taskFn).toHaveBeenCalledTimes(2);
  });
});
