import { deserializeChangeset, serializeChangeset } from '../../utils/serialize';

import { Document } from './document';
import { ChangesPayload, ClientPayload, Event, HeadTextPayload } from './document-server';
import { DelayedSocket } from './socket';

type BufferedMessage = Exclude<ClientPayload, HeadTextPayload>;

export class DocumentClient extends Document {
  private socket: DelayedSocket;

  private bufferedMessages: BufferedMessage[] = [];

  constructor(socket: DelayedSocket) {
    super();
    this.socket = socket;

    this.socket.onMessage((data) => {
      this.handleMessage(JSON.parse(data) as ClientPayload);
    });
  }

  connect() {
    this.socket.open();
  }

  get isConnected() {
    return this.socket.isOpen;
  }

  disconnect() {
    this.socket.close();
  }

  setRoundTripLatency(latency: number) {
    this.socket.setRoundTripLatency(latency);
  }

  private handleMessage(data: ClientPayload) {
    if (data.type === Event.HeadText) {
      this.handleServerLatestVersion({
        revision: data.payload.revision,
        changeset: deserializeChangeset(data.payload.changeset),
      });
      this.bufferedMessages = [];
    } else {
      this.bufferedMessages.push(data);
      this.processBufferedMessages();
    }
  }

  /**
   * Processed messages in order of revision
   */
  private processBufferedMessages() {
    let bufferedMessage: BufferedMessage | undefined;
    while ((bufferedMessage = this.popNextBufferedMessage())) {
      this.processBufferedMessage(bufferedMessage);
    }
  }

  /**
   *
   * @returns Pops message that has next revision
   */
  private popNextBufferedMessage() {
    this.bufferedMessages.sort((a, b) => b.payload.revision - a.payload.revision);

    const nextMessage = this.bufferedMessages[this.bufferedMessages.length - 1];
    if (nextMessage && this.revision + 1 === nextMessage.payload.revision) {
      this.bufferedMessages.pop();
      return nextMessage;
    }

    return;
  }

  private processBufferedMessage(data: BufferedMessage) {
    if (data.type === Event.ChangesAcknowledged) {
      this.handleSubmittedChangesAcknowledged(data.payload.revision);
    } else {
      // Event.Changes
      this.handleOtherClientChanges({
        revision: data.payload.revision,
        changeset: deserializeChangeset(data.payload.changeset),
      });
    }
  }

  public sendChanges() {
    const changes = this.readyChangesForServerSubmission();
    const data: ChangesPayload = {
      type: Event.Changes,
      payload: {
        revision: changes.revision,
        changeset: serializeChangeset(changes.changeset),
      },
    };
    this.socket.send(JSON.stringify(data));
  }

  public setCursorByValue(textWithCursors: string) {
    const pos1 = textWithCursors.indexOf('>');
    const pos2 = textWithCursors.indexOf('<');
    if (pos1 !== -1 && pos2 !== -1) {
      this.setSelection(pos1, pos2 - 1);
    } else if (pos1 !== -1) {
      this.setCursor(pos1);
    } else if (pos2 !== -1) {
      this.setCursor(pos2);
    }
  }

  public getValueWithCursors() {
    if (this.startCursorPos === this.endCursorPos) {
      return (
        this.value.substring(0, this.startCursorPos) +
        '>' +
        this.value.substring(this.startCursorPos)
      );
    }
    return (
      this.value.substring(0, this.startCursorPos) +
      '>' +
      this.value.substring(this.startCursorPos, this.endCursorPos) +
      '<' +
      this.value.substring(this.endCursorPos)
    );
  }

  getState() {
    return {
      A: `@${this.revision} ${this.latestServerChanges.toString()}`,
      X: this.submittedChanges.toString(),
      Y: this.localChanges.toString(),
      V: this.composedViewChangeset.toString(),
      value: this.getValueWithCursors(),
    };
  }
}
