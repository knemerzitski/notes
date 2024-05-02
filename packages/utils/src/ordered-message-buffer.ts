export interface OrderedMessageBufferOptions<TMessage> {
  /**
   * @default 0
   */
  version?: number;
  messages?: Readonly<Readonly<TMessage>>[];
  getVersion: (message: TMessage) => number;
}

/**
 * Pops messages in incremental seqence order by version.
 * Old messages are discarded and future ones are stored
 * until missing messages are present.
 */
export class OrderedMessageBuffer<TMessage> {
  private _currentVersion: number;
  get currentVersion() {
    return this._currentVersion;
  }

  private getVersion: (message: TMessage) => number;

  get size() {
    return this.stashedMessagesMap.size;
  }

  stashedMessagesMap: Map<number, TMessage>;

  constructor(options: OrderedMessageBufferOptions<TMessage>) {
    this._currentVersion = options.version ?? 0;
    this.getVersion = options.getVersion;
    this.stashedMessagesMap = new Map<number, TMessage>();
    options.messages?.forEach((message) => {
      this.add(message);
    });
  }

  /**
   * Add message to the buffer.
   * If next message become available then it is emitted from {@link messageBus}.
   */
  add(message: Readonly<TMessage>) {
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

    return true;
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
}
