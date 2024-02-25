import { Changeset, SerializedChangeset } from '../../changeset/changeset';
import { InsertStrip } from '../../changeset/insert-strip';
import { RevisionChangeset } from '../../changeset/revision-changeset';

import { EventBus } from './event-bus';
import { Scheduler } from './scheduler';
import { DelayedSocket, Socket } from './socket';

interface RevisionRecord {
  revision: number;
  changeset: Changeset;
}

interface Client {
  id: number;
  socket: Socket;
}

export enum Event {
  HeadText = 'headtext',
  Changes = 'changes',
  ChangesAcknowledged = 'changes-acknowledged',
}

export interface HeadTextPayload {
  type: Event.HeadText;
  payload: {
    clientId: number;
    revision: number;
    changeset: SerializedChangeset;
  };
}

export interface ChangesPayload {
  type: Event.Changes;
  payload: {
    revision: number;
    changeset: SerializedChangeset;
  };
}

export interface ChangesAcknowlegedPayload {
  type: Event.ChangesAcknowledged;
  payload: {
    revision: number;
  };
}

export type ClientPayload = HeadTextPayload | ChangesPayload | ChangesAcknowlegedPayload;
export type ServerPayload = ChangesPayload;

export class DocumentServer {
  private nextClientId = 1;

  private headtext = {
    revision: 0,
    changeset: Changeset.EMPTY,
  };

  private revisionRecords: RevisionRecord[] = [this.headtext];

  private clients: Client[] = [];

  /**
   * Create new socket usable in DocumentClient.
   * @param scheduler
   * @param log
   * @returns Socket that has listeners tied to this server.
   */
  newSocket(scheduler: Scheduler, log = false) {
    const clientId = this.nextClientId++;

    const serverBus = new EventBus();
    const clientBus = new EventBus();

    const serverSocket = new Socket(clientBus, serverBus, log ? 'server' : undefined);
    serverSocket.onMessage((data) => {
      this.handleMessage(clientId, JSON.parse(data) as ServerPayload);
    });

    this.clients.push({
      id: clientId,
      socket: serverSocket,
    });

    const clientSocket = new DelayedSocket({
      scheduler,
      sendBus: serverBus,
      receiveBus: clientBus,
      logName: log ? `client ${clientId}` : undefined,
    });

    clientSocket.onOpened(() => {
      const data: HeadTextPayload = {
        type: Event.HeadText,
        payload: {
          clientId,
          revision: this.headtext.revision,
          changeset: this.headtext.changeset.serialize(),
        },
      };
      serverSocket.send(JSON.stringify(data));
    });

    return clientSocket;
  }

  private handleMessage(clientId: number, data: ServerPayload) {
    this.handleDocumentChanges(clientId, RevisionChangeset.deserialize(data.payload));
  }

  private getNextRevisionNumber() {
    return (this.revisionRecords[this.revisionRecords.length - 1]?.revision ?? 0) + 1;
  }

  private handleDocumentChanges(clientId: number, clientChanges: RevisionChangeset) {
    const client = this.clients.find((client) => client.id === clientId);
    if (!client) {
      throw Error(`Client ${clientId} doesn't exist!`);
    }

    // changeset might be of different revision than assuming from client??
    //const clientRevisionNumber = client.revisionNumber;
    const clientRevision = clientChanges.revision;

    const clientRevisionRecordIndex = this.revisionRecords.findLastIndex(
      (record) => record.revision == clientRevision
    );

    // Apply client changes according to headtext
    let currentClientChangeset: Changeset = clientChanges.changeset;
    for (let i = clientRevisionRecordIndex + 1; i < this.revisionRecords.length; i++) {
      const revisionRecord = this.revisionRecords[i];
      if (!revisionRecord) {
        throw new Error(
          `Missing revision record at index ${i} for client ${clientId} with revision ${clientRevision} and submitted changeset ${String(
            clientChanges
          )}`
        );
      }

      currentClientChangeset = revisionRecord.changeset.follow(currentClientChangeset);
    }

    const newRevisionRecord: RevisionRecord = {
      revision: this.getNextRevisionNumber(),
      changeset: currentClientChangeset,
    };
    this.revisionRecords.push(newRevisionRecord);

    this.headtext = {
      changeset: this.headtext.changeset.compose(newRevisionRecord.changeset),
      revision: newRevisionRecord.revision,
    };

    const documentChangesPayload: ChangesPayload = {
      type: Event.Changes,
      payload: {
        revision: newRevisionRecord.revision,
        changeset: newRevisionRecord.changeset.serialize(),
      },
    };
    const serializedDocumentChangesPayload = JSON.stringify(documentChangesPayload);
    this.clients
      .filter(({ id, socket }) => id !== clientId && socket.isOpen)
      .forEach((client) => {
        client.socket.send(serializedDocumentChangesPayload);
        //client.revisionNumber = newRevisionRecord.revisionNumber;
      });

    if (client.socket.isOpen) {
      const changesAcknowlegedPayload: ChangesAcknowlegedPayload = {
        type: Event.ChangesAcknowledged,
        payload: {
          revision: newRevisionRecord.revision,
        },
      };
      client.socket.send(JSON.stringify(changesAcknowlegedPayload));
      //client.revisionNumber = newRevisionRecord.revisionNumber;
    }
  }

  getHeadText() {
    return this.headtext.changeset.strips.values
      .map((strip) => (strip instanceof InsertStrip ? strip.value : ''))
      .join('');
  }

  getState() {
    return {
      records: this.revisionRecords.map(
        ({ changeset, revision }) => `@${revision} ${changeset.toString()}`
      ),
      head: `@${this.headtext.revision} ${this.headtext.changeset.toString()}`,
      clients: this.clients.map(({ id }) => ({
        id,
      })),
    };
  }
}
