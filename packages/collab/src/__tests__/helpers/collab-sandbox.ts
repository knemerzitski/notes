import mapObject from 'map-obj';
import mitt from 'mitt';

import { createLogger } from '../../../../utils/src/logging';

import { PartialBy } from '../../../../utils/src/types';

import {
  CollabService,
  BasicSelection,
  BasicTyper,
  TypingOptions,
  CollabServiceServerFacade,
  CollabServiceServerFacadeEvents,
  createStateFromHeadRecord,
  CollabServiceHeadRecord,
  CollabServiceEvents,
  ControlledTyper,
  JsonTyperService,
  spaceNewlineHook,
  TextParser,
} from '../../client';
import { Changeset } from '../../common/changeset';
import { Selection } from '../../common/selection';
import {
  processSubmittedRecord,
  ServerRecord,
  TailRecord,
  HeadRecord,
  SubmittedRecord,
  composeNewTail,
  createStateFromRecords,
} from '../../server';

import { textWithSelection, textWithSelections } from './selection';

export function createCollabSandbox<TClientName extends string>(options?: {
  server?: ConstructorParameters<typeof Server>[0];
  clients?: (
    | ({ name: TClientName } & Omit<
        ConstructorParameters<typeof Client>[0],
        'name' | 'server'
      >)
    | TClientName
  )[];
  client?: Omit<ConstructorParameters<typeof Client>[0], 'name' | 'server'>;
}) {
  const server = new Server(options?.server);

  const clients =
    options?.clients?.map((importantOptions) =>
      typeof importantOptions === 'string'
        ? server.createClient(importantOptions, options.client)
        : server.createClient(importantOptions.name, {
            ...options.client,
            ...importantOptions,
            service: {
              ...options.client?.service,
              ...importantOptions.service,
              context: {
                ...options.client?.service?.context,
                ...importantOptions.service?.context,
              },
            },
          })
    ) ?? [];

  const clientByName = clients.reduce(
    (obj, client) => {
      obj[client.name as TClientName] = client;
      return obj;
    },
    {} as Record<TClientName, Client>
  );

  return {
    server,
    client: clientByName,
  };
}

interface ServerEvents {
  'records:new': {
    readonly server: Server;
  };
}

class Server {
  private readonly eventBus = mitt<ServerEvents>();
  readonly on = this.eventBus.on.bind(this.eventBus);
  readonly off = this.eventBus.off.bind(this.eventBus);

  private readonly _records: ServerRecord[];

  private _tailRecord: TailRecord;

  private _headRecord: HeadRecord;

  private readonly clients: Client[];

  private readonly recordsLimit;

  get records(): readonly ServerRecord[] {
    return this._records;
  }

  get headRecord(): HeadRecord {
    return this._headRecord;
  }

  get headText(): string {
    return this.headRecord.text.getText();
  }

  get tailRecord(): TailRecord {
    return this._tailRecord;
  }

  constructor(options?: {
    records?: Omit<ServerRecord, 'inverse'>[];
    /**
     * Limit records count. -1 for no limit.
     * @default -1
     */
    recordsLimit?: number;
  }) {
    this.recordsLimit = options?.recordsLimit ?? -1;

    const state = createStateFromRecords(options?.records);

    this._tailRecord = state.tailRecord;
    this._records = state.records;
    this._headRecord = state.headRecord;

    this.clients = [];
  }

  revisionToIndex(revision: number) {
    return revision - this.tailRecord.revision - 1;
  }

  createClient(
    name: string,
    options?: Omit<ConstructorParameters<typeof Client>[0], 'server' | 'name'>
  ): Client {
    const authorId = options?.userId ?? name;

    const client = new Client({
      ...options,
      service: {
        isExternalTypingHistory: (record) => record.authorId === authorId,
        state: createStateFromHeadRecord(this.headRecord),
        ...options?.service,
        // Any typing from same author is part of history
        context: {
          logger: createLogger(`${name}:service`, {
            format: 'object',
          }),
          ...options?.service?.context,
        },
      },
      name,
      server: this,
    });
    this.clients.push(client);
    return client;
  }

  getClients(excludedNames: string[]) {
    return this.clients.filter(
      (client) => !client.disconnected && !excludedNames.includes(client.name)
    );
  }

  getClient(name: string): Client {
    const client = this.clients.find((client) => client.name === name);
    if (!client) {
      throw new Error(`No such client ${name}`);
    }
    return client;
  }

  addRecord(submittedRecord: SubmittedRecord) {
    const result = processSubmittedRecord(
      submittedRecord,
      this._records,
      this.headRecord
    );

    if (result.type === 'new') {
      this._records.push(result.record);
      this._headRecord = result.headRecord;
      this.eventBus.emit('records:new', {
        server: this,
      });
    }

    // Apply recordsLimit
    this.triggerRecordsLimit();

    return result;
  }

  private triggerRecordsLimit() {
    if (this.recordsLimit < 0) {
      return;
    }

    const threshold = 32;

    const deleteCount = this._records.length - this.recordsLimit;
    if (deleteCount >= threshold) {
      const newTailRecord = composeNewTail(this.tailRecord, this._records, deleteCount);

      this._tailRecord = newTailRecord;

      this._records.splice(0, deleteCount);
    }
  }

  getViewTextWithSelections() {
    return Object.entries(
      this.clients.reduce<Record<string, Client[]>>((selectionsByText, client) => {
        if (!(client.viewText in selectionsByText)) {
          selectionsByText[client.viewText] = [client];
        } else {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          selectionsByText[client.viewText]!.push(client);
        }
        return selectionsByText;
      }, {})
    ).map(([text, clients]) =>
      textWithSelections(
        text,
        clients.map((client) => ({
          label: client.name,
          selection: client.caret,
        }))
      )
    );
  }
}

class Client {
  readonly name;
  readonly userId;

  private readonly server;

  private readonly service;
  readonly on;
  readonly off;

  private readonly typer;
  private readonly json;

  private _disconnected;

  constructor(options: {
    name: string;
    /**
     * @default name
     */
    userId?: string;
    server: Server;
    disconnected?: boolean;
    service?: ConstructorParameters<typeof CollabService>[0];
    /**
     * Receive missing revisions when event is emit
     * @default false
     */
    requestMissingRevisions?: boolean;
    jsonTyper?: PartialBy<
      Omit<ConstructorParameters<typeof JsonTyperService>[0], 'collabService'>,
      'context'
    >;
  }) {
    this.name = options.name;
    this.userId = options.userId ?? this.name;
    this._disconnected = options.disconnected ?? false;

    this.server = options.server;

    this.service = new CollabService(options.service);
    this.on = this.service.on.bind(this.service);
    this.off = this.service.on.bind(this.service);

    this.service.setServerFacade(new LocalServerFacade(this.server));

    const serviceTyper = new BasicTyper(this.service);
    this.typer = new ControlledTyper(serviceTyper, new BasicSelection(serviceTyper));

    if (options.jsonTyper) {
      const fieldNames = options.jsonTyper.fieldNames;
      const logger = createLogger(`${this.name}:json`, {
        format: 'object',
      });
      const jsonService = new JsonTyperService({
        collabService: this.service,
        context: {
          logger,
          parser: new TextParser({
            logger: logger.extend('parser'),
            hook: spaceNewlineHook,
            keys: fieldNames,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            fallbackKey: fieldNames[0]!,
          }),
        },
        ...options.jsonTyper,
      });

      this.json = {
        service: jsonService,
        typers: Object.fromEntries(
          fieldNames.map((fieldName) => {
            const fieldTyper = jsonService.getTyper(fieldName);
            const selector = new BasicSelection(fieldTyper);
            const typer = new ControlledTyper(fieldTyper, selector);

            return [fieldName, typer];
          })
        ),
      };
    } else {
      this.json = null;
    }

    // Send Service records if it's missing some
    if (options.requestMissingRevisions) {
      const handleMissingRevisions = ({
        missing: { startRevision, endRevision },
      }: Omit<CollabServiceEvents['queuedMessages:missing'], 'service'>) => {
        for (let revision = startRevision; revision < endRevision; revision++) {
          const record = this.server.records[this.server.revisionToIndex(revision)];
          if (!record) {
            continue;
          }

          this.service.addExternalTyping(record);
        }
      };
      this.service.on('queuedMessages:missing', handleMissingRevisions);

      const missing = this.service.getMissingRevisions();
      if (missing) {
        handleMissingRevisions({ missing });
      }
    }
  }

  get serverText() {
    return this.service.serverText;
  }

  get submittedChanges() {
    return this.service.submittedChanges;
  }

  get localChanges() {
    return this.service.localChanges;
  }

  haveLocalChanges() {
    return this.service.haveLocalChanges();
  }

  haveSubmittedChanges() {
    return this.service.haveSubmittedChanges();
  }

  haveChanges() {
    return this.service.haveChanges();
  }

  canSubmitChanges() {
    return this.service.canSubmitChanges();
  }

  get viewText(): string {
    return this.service.viewText;
  }

  get caret() {
    return this.typer.caret;
  }

  get historySize() {
    return this.service.historySize;
  }

  get disconnected() {
    return this._disconnected;
  }

  reset(headRecord?: CollabServiceHeadRecord) {
    this.service.reset(headRecord);
  }

  catchUpToServer() {
    this.service.catchUpToServer();
  }

  getViewTextWithSelection(): string {
    return textWithSelection(this.viewText, this.typer.caret);
  }

  getFieldTextsWithSelection(): Record<string, string> {
    if (!this.json) {
      throw new Error('JsonTyperService is not enabled');
    }

    return mapObject(this.json.typers, (fieldName, typer) => [
      fieldName as string,
      textWithSelection(typer.value, typer.caret),
    ]);
  }

  /**
   * Disconnected client won't receive records from other clients but can still submit changes
   */
  disconnect() {
    this._disconnected = true;
  }

  reconnect() {
    this._disconnected = false;
  }

  setCaret(selection: Selection): void;
  setCaret(start: number, end?: number): void;
  setCaret(start: Selection | number, end?: number): void {
    if (Selection.is(start)) {
      this.typer.setCaret(start);
    } else {
      this.typer.setCaret(start, end);
    }
  }

  insert(value: string, options?: TypingOptions) {
    this.typer.insert(value, options);
  }

  delete(count = 1, options?: TypingOptions) {
    this.typer.delete(count, options);
  }

  getField(
    fieldName: string
  ): Pick<ControlledTyper, 'caret' | 'setCaret' | 'value' | 'insert' | 'delete'> {
    if (!this.json) {
      throw new Error('JsonTyperService is not enabled');
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.json.typers[fieldName]!;
  }

  canUndo() {
    return this.service.canUndo();
  }

  undo() {
    return this.service.undo();
  }

  canRedo() {
    return this.service.canRedo();
  }

  redo() {
    return this.service.redo();
  }

  serialize() {
    return this.service.serialize();
  }

  deserialize(value: unknown) {
    this.service.deserialize(value);
  }

  submitChanges() {
    return this.submissionContext().submitChanges();
  }

  submitChangesInstant() {
    this.submissionContext().submitChangesInstant();
  }

  private submissionContext() {
    const submitChanges = () => {
      const submitRecord = this.service.submitChanges();
      if (!submitRecord) {
        throw new Error('Unexpected submit without any changes');
      }

      return {
        submitRecord,
        serverReceive: () => {
          const serverResult = this.server.addRecord({
            ...submitRecord,
            authorId: this.userId,
          });

          const { type, record: serverRecord } = serverResult;

          const clientAcknowledge = () => {
            this.service.submittedChangesAcknowledged(serverRecord);
          };

          const sendToOtherClients = () => {
            if (type === 'duplicate') {
              return;
            }

            this.server.getClients([this.name]).forEach((otherClient) => {
              otherClient.service.addExternalTyping(serverRecord);
            });
          };

          return {
            serverResult,
            clientAcknowledge,
            sendToOtherClients,
            acknowledgeAndSendToOtherClients: () => {
              clientAcknowledge();
              sendToOtherClients();
            },
          };
        },
      };
    };

    return {
      submitChanges,
      submitChangesInstant: () => {
        submitChanges().serverReceive().acknowledgeAndSendToOtherClients();
      },
    };
  }

  getDebugObject() {
    // @ts-expect-error Accessing only during testing
    return this.service.computedState.getDebugObject();
  }
}

class LocalServerFacade implements CollabServiceServerFacade {
  private readonly eventBus = mitt<CollabServiceServerFacadeEvents>();
  readonly on = this.eventBus.on.bind(this.eventBus);
  readonly off = this.eventBus.off.bind(this.eventBus);

  constructor(private readonly server: Server) {
    server.on('records:new', () => {
      this.eventBus.emit('head:updated', {
        facade: this,
        headRecord: this.server.headRecord,
      });

      this.eventBus.emit('records:updated', {
        facade: this,
      });
    });
  }

  head(): HeadRecord {
    return this.server.headRecord;
  }

  text(targetRevision: number): TailRecord | undefined {
    if (!targetRevision) {
      return this.server.tailRecord;
    }

    const index = this.server.revisionToIndex(targetRevision);
    if (index < 0) {
      return;
    }

    return {
      revision: targetRevision,
      text: this.server.records
        .slice(0, index + 1)
        .map((r) => r.changeset)
        .reduce(Changeset.compose, this.server.tailRecord.text),
    };
  }

  range(startRevision: number, endRevision: number): readonly ServerRecord[] {
    return this.server.records.slice(
      this.server.revisionToIndex(startRevision),
      this.server.revisionToIndex(endRevision)
    );
  }

  at(revision: number): ServerRecord | undefined {
    return this.server.records[this.server.revisionToIndex(revision)];
  }

  beforeIterable(beforeRevision: number): Iterable<ServerRecord> {
    const initialIndex = this.server.revisionToIndex(beforeRevision) - 1;
    if (initialIndex < 0) {
      return {
        [Symbol.iterator]: () => ({
          next: () => ({ done: true, value: undefined }),
        }),
      };
    }

    let index = initialIndex;
    const records = [...this.server.records];

    return {
      [Symbol.iterator]: () => ({
        next: () => {
          const value = records[index--];
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

  hasBefore(revision: number): boolean {
    const index = this.server.revisionToIndex(revision - 1);

    return this.server.records[index] !== undefined;
  }
}
