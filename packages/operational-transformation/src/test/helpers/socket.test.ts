import { describe, expect, it, vi } from 'vitest';

import { EventBus } from './event-bus';
import { Scheduler } from './scheduler';
import { DelayedSocket, Socket } from './socket';

describe('Socket', () => {
  function createSocketPair() {
    const sendBus = new EventBus();
    const receiveBus = new EventBus();
    const client = new Socket(sendBus, receiveBus);
    const server = new Socket(receiveBus, sendBus);

    return { client, server };
  }

  describe('open', () => {
    it('opens both sockets', () => {
      const { client, server } = createSocketPair();

      expect(client.isOpen).toBeFalsy();
      expect(server.isOpen).toBeFalsy();
      client.open();
      expect(client.isOpen).toBeTruthy();
      expect(server.isOpen).toBeTruthy();
    });

    it('throws error if called twice', () => {
      const { client } = createSocketPair();

      client.open();
      expect(() => {
        client.open();
      }).toThrow();
    });

    it('calls onOpened', () => {
      const { client } = createSocketPair();

      const openedFn = vi.fn();

      client.onOpened(openedFn);

      client.open();

      expect(openedFn).toHaveBeenCalledOnce();
    });
  });

  describe('send', () => {
    it('throws error if socket not open', () => {
      const { client } = createSocketPair();
      expect(() => {
        client.send('data');
      }).toThrow();
    });

    it('sends message', () => {
      const { client, server } = createSocketPair();

      const receiveFn = vi.fn();

      client.open();
      server.onMessage(receiveFn);
      client.send('data');

      expect(receiveFn).toHaveBeenCalledWith('data');
    });
  });

  describe('close', () => {
    it('throws error if socket not open', () => {
      const { client } = createSocketPair();
      expect(() => {
        client.close();
      }).toThrow();
    });

    it('closes socket', () => {
      const { client } = createSocketPair();

      client.open();
      client.close();
      expect(client.isOpen).toBeFalsy();
    });

    it('calls onClosed', () => {
      const { client } = createSocketPair();

      const closedFn = vi.fn();

      client.open();

      client.onClosed(closedFn);

      client.close();

      expect(closedFn).toHaveBeenCalledOnce();
    });
  });
});

describe('DelayedSocket', () => {
  function createSocketPair() {
    const scheduler = new Scheduler();
    const sendBus = new EventBus();
    const receiveBus = new EventBus();
    const client = new DelayedSocket({ scheduler, sendBus, receiveBus });
    const server = new DelayedSocket({
      scheduler,
      sendBus: receiveBus,
      receiveBus: sendBus,
    });

    return { scheduler, client, server };
  }

  it('delays sending/receiving', () => {
    const { scheduler, client, server } = createSocketPair();

    const serverMsg = vi.fn();
    const clientMsg = vi.fn();
    client.onMessage(clientMsg);
    server.onMessage(serverMsg);

    client.setRoundTripLatency(200);

    client.open();
    expect(client.isOpen).toBeFalsy();
    scheduler.run();
    expect(client.isOpen).toBeTruthy();
    client.send('slow');
    expect(serverMsg).not.toHaveBeenCalled();
    scheduler.run(50);
    expect(serverMsg).not.toHaveBeenCalled();
    scheduler.run(50);
    expect(serverMsg).toHaveBeenCalled();

    server.send('slow receive');
    scheduler.run(50);
    expect(clientMsg).not.toHaveBeenCalled();
    scheduler.run(50);
    expect(clientMsg).toHaveBeenCalled();
  });
});
