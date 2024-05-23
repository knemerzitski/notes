import mitt, { Emitter } from './mitt-unsub';
import {
  ParseError,
  Serializable,
  assertHasProperties,
  parseOrDefault,
} from './serialize';
import isDefined from './type-guards/isDefined';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OrderedMessageBufferEvents<TMessage> = {
  /**
   * Starting to process messages
   */
  processingMessages: {
    eventBus: Emitter<ProcessingEvents<TMessage>>;
  };
  /**
   * Message is processed
   */
  nextMessage: TMessage;
  /**
   * No more messages left to process.
   */
  messagesProcessed: undefined;
};

export interface SerializedOrderedMessageBuffer<TSerializedMessage> {
  version: number;
  messages: TSerializedMessage[];
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ProcessingEvents<TMessage> = {
  /**
   * Message is processed
   */
  nextMessage: TMessage;
  /**
   * No more messages left to process.
   */
  messagesProcessed: undefined;
};

export interface OrderedMessageBufferOptions<TMessage, TSerializedMessage = TMessage> {
  /**
   * @default 0
   */
  version?: number;
  messages?: Readonly<Readonly<TMessage>>[];
  getVersion: (message: TMessage) => number;
  serializeMessage: (message: TMessage) => TSerializedMessage;
  eventBus?: Emitter<OrderedMessageBufferEvents<TMessage>>;
}

/**
 * Pops messages in incremental seqence order by version.
 * Old messages are discarded and future ones are stored
 * until missing messages are present.
 */
export class OrderedMessageBuffer<TMessage, TSerializedMessage = TMessage>
  implements Serializable<SerializedOrderedMessageBuffer<TSerializedMessage>>
{
  readonly eventBus: Emitter<OrderedMessageBufferEvents<TMessage>>;
  private processingEventBus: Emitter<ProcessingEvents<TMessage>>;

  private _currentVersion: number;
  get currentVersion() {
    return this._currentVersion;
  }

  private getVersion: (message: TMessage) => number;
  private serializeMessage: (message: TMessage) => TSerializedMessage;

  get size() {
    return this.stashedMessagesMap.size;
  }

  stashedMessagesMap: Map<number, TMessage>;

  constructor(options: OrderedMessageBufferOptions<TMessage, TSerializedMessage>) {
    this.eventBus = options.eventBus ?? mitt();
    this.processingEventBus = mitt();
    this._currentVersion = options.version ?? 0;
    this.getVersion = options.getVersion;
    this.serializeMessage = options.serializeMessage;
    this.stashedMessagesMap = new Map<number, TMessage>();
    options.messages?.forEach((message) => {
      this.add(message);
    });
  }

  /**
   * Change version of the buffer. All older messages are discarded.
   * Future messages are kept.
   */
  setVersion(newVersion: number, startProcessing = true){
    if(newVersion === this._currentVersion) return;
    if(newVersion < this._currentVersion){
      this._currentVersion = newVersion;
      return;
    }

    // Must discard older messages (this._currentVersion,newVersion]
    for(let i = this._currentVersion + 1; i <= newVersion; i++){
      this.stashedMessagesMap.delete(i);
    }

    this._currentVersion = newVersion;

    if (startProcessing) {
      this.processMessages();
    }
  }

  /**
   * Add message to the buffer.
   * If next message become available then it is emitted from {@link messageBus}.
   */
  add(message: Readonly<TMessage>, startProcessing = true) {
    const version = this.getVersion(message);

    if (version <= this._currentVersion) {
      // Ignore old message
      return false;
    }

    if (this.stashedMessagesMap.has(version)) {
      // Ignore duplicate message
      return false;
    }

    this.stashedMessagesMap.set(version, message);

    if (startProcessing) {
      this.processMessages();
    }

    return true;
  }

  processMessages() {
    if (!this.hasNextMessage()) return;
    try {
      this.eventBus.emit('processingMessages', {
        eventBus: this.processingEventBus,
      });

      for (const message of this.popIterable()) {
        this.processingEventBus.emit('nextMessage', message);
        this.eventBus.emit('nextMessage', message);
      }
      this.processingEventBus.emit('messagesProcessed');
      this.eventBus.emit('messagesProcessed');
    } finally {
      this.processingEventBus.all.clear();
    }
  }

  peekNextMessage() {
    const nextVersion = this._currentVersion + 1;
    return this.stashedMessagesMap.get(nextVersion);
  }

  hasNextMessage() {
    return Boolean(this.peekNextMessage());
  }

  popNextMessage(): TMessage | undefined {
    const nextVersion = this._currentVersion + 1;
    const nextMessage = this.stashedMessagesMap.get(nextVersion);
    if (!nextMessage) {
      return;
    }

    this.stashedMessagesMap.delete(nextVersion);
    this._currentVersion = nextVersion;

    return nextMessage;
  }

  /**
   *
   * @returns All stashed messages.
   */
  getAllMessages(): IterableIterator<TMessage> {
    return this.stashedMessagesMap.values();
  }

  popIterable(): Iterable<TMessage> {
    return {
      [Symbol.iterator]: () => ({
        next: () => {
          const value = this.popNextMessage();
          if (value != null) {
            return {
              done: false,
              value,
            };
          } else {
            return { done: true, value };
          }
        },
      }),
    };
  }

  serialize(): SerializedOrderedMessageBuffer<TSerializedMessage> {
    return {
      version: this._currentVersion,
      messages: [...this.stashedMessagesMap.values()].map((msg) =>
        this.serializeMessage(msg)
      ),
    };
  }

  static parseValue<T, U = T>(
    value: unknown,
    parseMessage: (msg: unknown) => T
  ): Pick<OrderedMessageBufferOptions<T, U>, 'version' | 'messages'> {
    assertHasProperties(value, ['version', 'messages']);

    if (!Array.isArray(value.messages)) {
      throw new ParseError(
        `Expected 'messages' to be an array, found '${String(value.messages)}'`
      );
    }

    return {
      version: Number(value.version),
      messages: value.messages
        .map((msg) => parseOrDefault(() => parseMessage(msg), undefined))
        .filter(isDefined),
    };
  }
}
