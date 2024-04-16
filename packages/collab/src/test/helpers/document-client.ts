import { Changeset } from '../../changeset/changeset';
import { CollabEditor } from '../../editor/collab-editor';

import { ChangesPayload, ClientPayload, Event } from './document-server';
import { DelayedSocket } from './socket';

export class DocumentClient extends CollabEditor {
  private socket: DelayedSocket;

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
      // this.handleServerChangeset({
      //   revision: data.payload.revision,
      //   changeset: deserializeChangeset(data.payload.changeset),
      // });
      // this.handleExternalChange({
      //   revision: data.payload.revision,
      //   changeset: deserializeChangeset(data.payload.changeset),
      // });
      this.handleExternalChange({
        revision: data.payload.revision,
        changeset: Changeset.parseValue(data.payload.changeset),
      });
    } else if (data.type === Event.ChangesAcknowledged) {
      this.submittedChangesAcknowledged({
        revision: data.payload.revision,
        changeset: Changeset.parseValue(data.payload.changeset),
      });
    } else {
      // this.handleExternalChange({
      //   revision: data.payload.revision,
      //   changeset: deserializeChangeset(data.payload.changeset),
      // });
      this.handleExternalChange({
        revision: data.payload.revision,
        changeset: Changeset.parseValue(data.payload.changeset),
      });
    }
  }

  public sendChanges() {
    const changes = this.submitChanges();
    if(!changes) return;
    const data: ChangesPayload = {
      type: Event.Changes,
      payload: {
        revision: changes.revision,
        changeset: changes.changeset.serialize(),
      },
    };
    this.socket.send(JSON.stringify(data));
  }

  // TODO use helper
  public setCaretByValue(textWithCursors: string) {
    const pos1 = textWithCursors.indexOf('>');
    const pos2 = textWithCursors.indexOf('<');
    if (pos1 !== -1 && pos2 !== -1) {
      this.setSelectionRange(pos1, pos2 - 1);
    } else if (pos1 !== -1) {
      this.setCaretPosition(pos1);
    } else if (pos2 !== -1) {
      this.setCaretPosition(pos2);
    }
  }

  // TODO use helper
  public getValueWithSelection() {
    if (this.selectionStart === this.selectionEnd) {
      return (
        this.value.substring(0, this.selectionStart) +
        '>' +
        this.value.substring(this.selectionStart)
      );
    }
    return (
      this.value.substring(0, this.selectionStart) +
      '>' +
      this.value.substring(this.selectionStart, this.selectionEnd) +
      '<' +
      this.value.substring(this.selectionEnd)
    );
  }

  getState() {
    return {
      A: `@${this.serverTextRevision} ${this.textServer.toString()}`,
      X: this.textSubmitted.toString(),
      Y: this.textLocal.toString(),
      V: this.textView.toString(),
      value: this.getValueWithSelection(),
    };
  }
}
