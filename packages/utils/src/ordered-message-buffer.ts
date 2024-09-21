import { memoize1 } from './memoize1';
import { mitt, Emitter } from './mitt-unsub';
import { array, Infer, number, object, Struct } from 'superstruct';

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
  /**
   * Need messages from start to end (inclusive) to process all stashes messages.
   */
  missingMessages: { start: number; end: number };
};

export const OrderedMessageBufferParamsStruct = memoize1(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <T extends Struct<any, any>>(MessageStruct: T) =>
    object({
      version: number(),
      messages: array(MessageStruct),
    })
);

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

interface MessageMapper<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TMessageStruct extends Struct<any, any>,
  TMessage = Infer<TMessageStruct>,
> {
  struct: TMessageStruct;
  version: (message: TMessage) => number;
}

export interface OrderedMessageBufferParams<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TMessageStruct extends Struct<any, any>,
  TMessage = Infer<TMessageStruct>,
> {
  messageMapper: MessageMapper<TMessageStruct, TMessage>;
  /**
   * @default 0
   */
  version?: number;
  messages?: Readonly<Readonly<TMessage>>[];
  eventBus?: Emitter<OrderedMessageBufferEvents<TMessage>>;
}

/**
 * Pops messages in incremental seqence order by version.
 * Old messages are discarded and future ones are stored
 * until missing messages are present.
 */
export class OrderedMessageBuffer<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TMessageStruct extends Struct<any, any>,
  TMessage = Infer<TMessageStruct>,
> {
  static readonly DEFAULT_VERSION = 0;

  readonly eventBus: Emitter<OrderedMessageBufferEvents<TMessage>>;
  private processingEventBus: Emitter<ProcessingEvents<TMessage>>;

  private _currentVersion: number;
  get currentVersion() {
    return this._currentVersion;
  }

  private readonly messageMapper: MessageMapper<TMessageStruct, TMessage>;

  private maxStashedVersion: number | null = null;

  get size() {
    return this.stashedMessagesMap.size;
  }

  stashedMessagesMap: Map<number, TMessage>;

  private readonly struct: ReturnType<
    typeof OrderedMessageBufferParamsStruct<TMessageStruct>
  >;

  constructor(params: OrderedMessageBufferParams<TMessageStruct>) {
    this.struct = OrderedMessageBufferParamsStruct(params.messageMapper.struct);
    this.messageMapper = params.messageMapper;
    this.eventBus = params.eventBus ?? mitt();
    this.processingEventBus = mitt();
    this._currentVersion = params.version ?? OrderedMessageBuffer.DEFAULT_VERSION;
    this.stashedMessagesMap = new Map<number, TMessage>();
    params.messages?.forEach((message) => {
      this.add(message);
    });
  }

  reset() {
    this.stashedMessagesMap.clear();
    this._currentVersion = OrderedMessageBuffer.DEFAULT_VERSION;
  }

  /**
   * Change version of the buffer. All older messages are discarded.
   * Future messages are kept.
   */
  setVersion(newVersion: number, startProcessing = true) {
    if (newVersion === this._currentVersion) return;
    if (newVersion < this._currentVersion) {
      this._currentVersion = newVersion;
      return;
    }

    // Must discard older messages (this._currentVersion,newVersion]
    for (let i = this._currentVersion + 1; i <= newVersion; i++) {
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
    const version = this.messageMapper.version(message);

    if (version <= this._currentVersion) {
      // Ignore old message
      return false;
    }

    if (this.stashedMessagesMap.has(version)) {
      // Ignore duplicate message
      return false;
    }

    this.maxStashedVersion =
      this.maxStashedVersion != null
        ? Math.max(this.maxStashedVersion, version)
        : version;
    this.stashedMessagesMap.set(version, message);

    if (startProcessing) {
      this.processMessages();
    }

    const missingVersions = this.getMissingVersions();
    if (missingVersions) {
      this.eventBus.emit('missingMessages', missingVersions);
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

  /**
   * @returns Range by start and end (inclusive) versions requires to process all messages.
   */
  getMissingVersions(): { start: number; end: number } | undefined {
    if (
      this.stashedMessagesMap.size === 0 ||
      this.peekNextMessage() != null ||
      this.maxStashedVersion == null
    )
      return;

    let biggestMissing = this.maxStashedVersion - 1;
    for (; biggestMissing > this.currentVersion; biggestMissing--) {
      if (this.stashedMessagesMap.get(biggestMissing) == null) {
        break;
      }
    }

    const start = this._currentVersion + 1;
    if (biggestMissing < start) return;

    return {
      start,
      end: biggestMissing,
    };
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

  serialize() {
    if (
      this._currentVersion === OrderedMessageBuffer.DEFAULT_VERSION &&
      this.stashedMessagesMap.size === 0
    ) {
      return;
    }

    return this.struct.createRaw({
      version: this._currentVersion,
      messages: [...this.stashedMessagesMap.values()],
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static parseValue<TMessageStruct extends Struct<any, any>>(
    value: unknown,
    messageStruct: TMessageStruct
  ): Pick<OrderedMessageBufferParams<TMessageStruct>, 'version' | 'messages'> {
    return OrderedMessageBufferParamsStruct(messageStruct).create(value);
  }
}
