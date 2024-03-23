import mitt, { Emitter } from 'mitt';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Events = {
  /**
   * Called when all messages that can be processed are processed.
   */
  messagesProcessed: {
    /***
     * Count of processed messages.
     */
    count: number;
  };
};

type MessageType = string | number | symbol;
type MessageVersion = number;

interface StashedMessage<Payload> {
  type: MessageType;
  payload: Payload;
}

interface IOrderedMessageBuffer<Messages extends Record<MessageType, unknown>> {
  readonly bus: Emitter<Messages>;
  readonly currentVersion: number;

  add<Key extends keyof Messages>(
    type: Key,
    version: MessageVersion,
    message: Messages[Key]
  ): void;
  add<Key extends keyof Messages>(
    type: undefined extends Messages[Key] ? Key : never,
    version: MessageVersion
  ): void;
}

export interface OrderedMessageBufferOptions<
  Messages extends Record<MessageType, unknown>,
> {
  /**
   * @default 0
   */
  initialVersion?: number;

  /**
   * Use a custom emitter.
   */
  bus?: Emitter<Messages>;

  eventBus?: Emitter<Events>;
}
/**
 * Handles all messages that have increasing numbered version ordering.
 * Emits buffered messages in sequential order based on current version.
 * Old messages are discarded and future ones are stored for later.
 */
export class OrderedMessageBuffer<Messages extends Record<MessageType, unknown>>
  implements IOrderedMessageBuffer<Messages>
{
  public readonly eventBus;
  public readonly bus;

  private _currentVersion: number;
  get currentVersion() {
    return this._currentVersion;
  }

  get size() {
    return Object.keys(this.stashedMessageMap).length;
  }

  constructor(options?: OrderedMessageBufferOptions<Messages>) {
    this._currentVersion = options?.initialVersion ?? 0;
    this.bus = options?.bus ?? mitt();
    this.eventBus = options?.eventBus ?? mitt();
  }

  private stashedMessageMap: Record<number, StashedMessage<unknown>> = {};

  /**
   * Add message to the buffer.
   * If next message become available then it is emitted from {@link bus}.
   */
  add<Key extends keyof Messages>(
    type: Key,
    version: MessageVersion,
    message?: Messages[Key]
  ) {
    if (version <= this._currentVersion) {
      // Ignore old message
      return false;
    }

    if (version in this.stashedMessageMap) {
      // Ignore duplicate message
      return false;
    }

    this.stashedMessageMap[version] = {
      type,
      payload: message,
    };

    this.processMessages();
    return true;
  }

  private processMessages() {
    let processedCount = 0;
    let currentMessage: StashedMessage<unknown> | undefined;
    while ((currentMessage = this.popNextMessage())) {
      this.bus.emit(currentMessage.type, currentMessage.payload as Messages[MessageType]);
      processedCount++;
    }
    if (processedCount > 0) {
      this.eventBus.emit('messagesProcessed', {
        count: processedCount,
      });
    }
  }

  private popNextMessage() {
    const nextVersion = this._currentVersion + 1;
    const nextMessage = this.stashedMessageMap[nextVersion];
    if (!nextMessage) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.stashedMessageMap[nextVersion];

    this._currentVersion = nextVersion;

    return nextMessage;
  }
}
