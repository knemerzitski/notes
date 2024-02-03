import { EventBus } from './event-bus';
import { Scheduler } from './scheduler';

type Data = string;

enum Event {
  Open = 'open',
  Opened = 'opened',
  Message = 'message',
  Close = 'close',
  Closed = 'closed',
}

/**
 * Fake socket controlled by two event buses. Used for simulating
 * a connection between server and client.
 * Enforces data to be serialized as a string.
 */
export class Socket {
  private sendBus: EventBus;
  private receiveBus: EventBus;

  private _opened = false;
  get isOpen() {
    return this._opened;
  }

  constructor(sendBus: EventBus, receiveBus: EventBus, logName?: string) {
    this.sendBus = sendBus;
    this.receiveBus = receiveBus;

    if (logName) {
      receiveBus.on('*', (name, payload) => {
        console.log(`${logName} received`, {
          name,
          payload,
        });
      });
    }

    this.receiveBus.on(Event.Open, () => {
      this._opened = true;
      this.sendBus.emit(Event.Opened);
    });

    this.receiveBus.on(Event.Opened, () => {
      this._opened = true;
    });

    this.receiveBus.on(Event.Close, () => {
      this._opened = false;
      this.sendBus.emit(Event.Closed);
    });

    this.receiveBus.on(Event.Closed, () => {
      this._opened = false;
    });
  }

  /**
   * Open socket for sending/receiving messages.
   */
  open() {
    if (this._opened) {
      throw new Error('Cannot connect. Socket is already connected.');
    }
    this.sendBus.emit(Event.Open);
  }

  send(data: Data) {
    if (!this._opened) {
      throw new Error('Cannot send message. Socket is not connected.');
    }
    this.sendBus.emit(Event.Message, data);
  }

  /**
   * Close socket from sending/receiving messages.
   */
  close() {
    if (!this._opened) {
      throw new Error('Cannot close. Socket is not connected.');
    }

    this._opened = false;
    this.sendBus.emit(Event.Close);
  }

  /**
   * Triggered when socket is opening.
   * Is called soon after {@link open} is invoked.
   * @param listener
   */
  onOpened(listener: () => void) {
    this.receiveBus.on(Event.Opened, listener);
  }

  /**
   * Listen to new messages.
   * Messages are not buffered. Without listener messages
   * are discarded.
   * @param listener
   * @returns
   */
  onMessage(listener: (data: Data) => void) {
    return this.receiveBus.on(Event.Message, listener);
  }

  /**
   * Triggered when socket is closing.
   * Is called soon after {@link close} is invoked.
   * @param listener
   */
  onClosed(listener: () => void) {
    this.receiveBus.on(Event.Closed, listener);
  }
}

interface DelayedSocketOptions {
  scheduler: Scheduler;
  sendBus: EventBus;
  receiveBus: EventBus;
  logName?: string;
}

/**
 * Socket controlled by a scheduler.
 * Useful for simulating a slow network connection.
 */
export class DelayedSocket extends Socket {
  private latency = {
    send: 0,
    receive: 0,
  };

  constructor({ scheduler, sendBus, receiveBus, logName }: DelayedSocketOptions) {
    const delayedSendBus = new EventBus();
    const delayedReceiveBus = new EventBus();

    if (logName) {
      delayedReceiveBus.on('*', (name, payload) => {
        console.log(`${logName} received`, {
          name,
          payload,
        });
      });
    }

    delayedSendBus.on('*', (name, payload) => {
      scheduler.add(this.latency.send, () => {
        sendBus.emit(name, payload);
      });
    });
    receiveBus.on('*', (name, payload) => {
      scheduler.add(this.latency.receive, () => {
        delayedReceiveBus.emit(name, payload);
      });
    });

    super(delayedSendBus, delayedReceiveBus);
  }

  /**
   *
   * @param latency Latency based on the scheduler
   */
  setRoundTripLatency(latency: number) {
    this.latency = {
      send: latency * 0.5,
      receive: latency * 0.5,
    };
  }
}
