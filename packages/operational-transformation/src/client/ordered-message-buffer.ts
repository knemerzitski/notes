import mitt, { Emitter } from 'mitt';

type MessageType = string | number | symbol;
type MessageVersion = number;

interface StashedMessage<Payload> {
  type: MessageType;
  version: MessageVersion;
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
}
/**
 * Handles all messages that have increasing numbered version ordering.
 * Emits buffered messages in sequential order based on current version.
 * Old messages are discarded and future ones are stored for later.
 */
export class OrderedMessageBuffer<Messages extends Record<MessageType, unknown>>
  implements IOrderedMessageBuffer<Messages>
{
  public readonly bus;

  private _currentVersion: number;
  get currentVersion() {
    return this._currentVersion;
  }

  constructor(options?: OrderedMessageBufferOptions<Messages>) {
    this._currentVersion = options?.initialVersion ?? 0;
    this.bus = options?.bus ?? mitt();
  }

  private stashedMessages: StashedMessage<unknown>[] = [];

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
      // Discard old messages
      return;
    }

    this.stashedMessages.push({
      type,
      version,
      payload: message,
    });

    this.processMessages();
  }

  private processMessages() {
    let currentMessage: StashedMessage<unknown> | undefined;
    while ((currentMessage = this.popNextMessage())) {
      this.bus.emit(currentMessage.type, currentMessage.payload as Messages[MessageType]);
    }
  }

  private popNextMessage() {
    this.stashedMessages.sort((a, b) => b.version - a.version);

    const nextMessage = this.stashedMessages[this.stashedMessages.length - 1];
    if (nextMessage && this._currentVersion + 1 === nextMessage.version) {
      this.stashedMessages.pop();
      this._currentVersion = nextMessage.version;
      return nextMessage;
    }
    return;
  }
}
