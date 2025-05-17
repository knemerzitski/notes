import { produce } from 'immer';
import {
  IncomingServerMessage,
  State,
  SubmittedServiceRecord,
  ServerFacade,
  Properties,
  SerializedState,
  LocalTypingRecord,
  ExternalTypingRecord,
  ServiceHeadRecord,
  ViewRecord,
} from './types';
import mitt from 'mitt';
import { asComputed } from './utils/as-computed';
import { $recipes } from './recipes';
import { $meals } from './meals';
import { Changeset } from '../../common/changeset';
import {
  transformPartialProperties,
  PartialProperties,
} from './utils/partial-properties';
import { createFromHeadRecord } from './utils/state';
import { TaskQueue } from './utils/task-queue';

interface BaseEvent {
  readonly service: Service;
}

export interface ServiceEvents {
  'view:changed': { readonly change: ViewRecord } & BaseEvent;
  /**
   * New local typing was added.
   */
  'localTyping:add': BaseEvent;
  /**
   * Local typing was applied. Could be either new local typing, undo or redo.
   * View has changed
   */
  'localTyping:applied': { readonly typing: LocalTypingRecord } & BaseEvent;
  /**
   * External typing was applied.
   * View has changed.
   */
  'externalTyping:applied': { readonly typing: ExternalTypingRecord } & BaseEvent;
  'localChanges:have': BaseEvent;
  'submittedChanges:have': BaseEvent;
  'submittedChanges:acknowledged': BaseEvent;
  /**
   * Received a message from server, external typing or submitted acknowledged or reset.
   */
  'serverRevision:changed': BaseEvent;
  /**
   * headRecord was replaced using `reset()` method.
   */
  'headRecord:reset': BaseEvent;
  /**
   * Service is missing following revisions. Cannot process any futher queued messages
   * until service has received missing messages.
   */
  'queuedMessages:missing': {
    readonly missing: NonNullable<State['missingMessageRevisions']>;
  } & BaseEvent;
  'undo:applied': { readonly typing: LocalTypingRecord } & BaseEvent;
  'redo:applied': { readonly typing: LocalTypingRecord } & BaseEvent;
  /**
   * More older records are available. canUndo might succeed now
   */
  'records:restored': BaseEvent;
}

export class Service {
  private readonly eventBus = mitt<ServiceEvents>();
  readonly on = this.eventBus.on.bind(this.eventBus);
  readonly off = this.eventBus.off.bind(this.eventBus);

  private readonly props: Properties;

  private commonEventsInitalState: State | null = null;

  private readonly eventPhaseQueue = new TaskQueue();

  constructor(props?: Properties | PartialProperties) {
    this.props = transformPartialProperties(props);

    // This might need cleanup if serverFacades is created outside
    this.serverFacades.on('records:updated', this.recordsRestored.bind(this));

    this.logger?.debug('constructor');
    // Triggers validation
    this.setNextState(this.state);
  }

  protected get computedState() {
    return this.props.state;
  }

  protected get state() {
    return this.computedState.state;
  }

  protected get context() {
    return this.props.context;
  }

  protected get logger() {
    return this.context.logger;
  }

  get serverText(): Changeset {
    return this.state.serverText;
  }

  get serverRevision(): number {
    return this.state.serverRevision;
  }

  get submittedChanges(): Changeset {
    return this.computedState.submittedChanges;
  }

  get localChanges(): Changeset {
    return this.computedState.localChanges;
  }

  get viewText() {
    return this.computedState.viewText;
  }

  get viewRevision() {
    return this.state.viewRevision;
  }

  /**
   * @see {@link MutableComputedState.historySize}
   */
  get historySize() {
    return this.computedState.historySize;
  }

  private get serverFacades() {
    return this.props.serverFacades;
  }

  getViewTextAtRevision(viewRevision: number): Changeset | undefined {
    return this.computedState.getViewTextAtRevision(viewRevision);
  }

  getViewChangeAtRevision(viewRevision: number): Changeset | undefined {
    return this.computedState.getViewChangeAtRevision(viewRevision)?.changeset;
  }

  /**
   * Adding facade enables service to undo records from server.
   */
  addServerFacade(serverFacade: ServerFacade) {
    this.serverFacades.add(serverFacade);
  }

  removeServerFacade(serverFacade: ServerFacade) {
    this.serverFacades.remove(serverFacade);
  }

  /**
   * Resets state to a specific server record.
   * Local history is deleted.
   */
  reset(
    headRecord: ServiceHeadRecord = {
      revision: this.state.serverRevision,
      text: this.state.serverText,
    }
  ) {
    this.logger?.debug('reset', headRecord);

    this.setCommonEventsInitialState(this.state);

    this.setNextState(createFromHeadRecord(headRecord));

    this.eventPhaseQueue.addAndFlush(() => {
      this.eventBus.emit('headRecord:reset', this.createEvent());

      this.emitCommonEvents();
    });
  }

  /**
   * Catch up to latest revision of the text.
   * Must have at least one serverFacade.
   */
  catchUpToServer() {
    const head = this.serverFacades.head();
    if (!head) {
      return;
    }

    if (head.revision <= this.state.serverRevision) {
      return;
    }

    this.logger?.debug('catchUp', head);

    for (const record of this.serverFacades.range(
      this.state.serverRevision + 1,
      head.revision + 1
    )) {
      this.addExternalTyping(record);
    }
  }

  haveLocalChanges() {
    return this.computedState.haveLocalChanges;
  }

  haveSubmittedChanges() {
    return this.computedState.haveSubmittedChanges;
  }

  haveChanges() {
    return this.computedState.haveChanges;
  }

  canSubmitChanges() {
    return this.computedState.canSubmitChanges;
  }

  /**
   * Add local typing that will be part of history and can be undone.
   * @param record
   */
  addLocalTyping(localRecord: Parameters<typeof $recipes.addLocalTyping>[0]): void {
    this.logger?.debug('addLocalTyping', localRecord);

    const initialState = this.state;
    this.setCommonEventsInitialState(initialState);

    const state_localTypingAdded = produce(
      this.state,
      $recipes.addLocalTyping(localRecord)
    );
    const computedState_localTypingAdded = asComputed(state_localTypingAdded);

    const hasViewTextChanged = this.viewText !== computedState_localTypingAdded.viewText;
    if (!hasViewTextChanged) {
      // Discard typing that makes no visual difference
      this.logger?.debug('addLocalTyping:discarded', localRecord);
      return;
    }

    const localTypings = state_localTypingAdded.tmpRecipeResults.localTypings.slice(
      initialState.tmpRecipeResults.localTypings.length
    );

    this.setNextState(produce(state_localTypingAdded, $recipes.resetLocalTypings));

    this.triggerCleanup();

    this.eventPhaseQueue.addAndFlush(() => {
      this.eventBus.emit('localTyping:add', this.createEvent());

      for (const typing of localTypings) {
        this.eventBus.emit('localTyping:applied', this.createEvent({ typing }));
      }

      this.emitCommonEvents();
    });
  }

  /**
   * Add record created by another external client. External typings
   * are not part of history stack.
   * @param record
   */
  addExternalTyping(record: Parameters<typeof $recipes.processExternalTyping>[0]): void {
    this.processIncomingServerMessage({
      type: 'external-typing',
      item: record,
    });
  }

  /**
   * Server has acknowledged currently submitted changes.
   * @param record Record that's been received from server.
   */
  submittedChangesAcknowledged(
    record: Parameters<typeof $recipes.acknowledgeSubmittedRecord>[0]
  ): void {
    this.processIncomingServerMessage({
      type: 'local-typing-acknowledged',
      item: record,
    });
  }

  /**
   * @returns Record that must be sent to server. Contains all changes
   * since last submission. Null if have no changes.
   */
  submitChanges(): SubmittedServiceRecord | null {
    this.logger?.debug('submitChanges');

    this.setCommonEventsInitialState(this.state);

    this.setNextState(produce(this.state, $recipes.submitChanges(this.context)));

    this.eventPhaseQueue.addAndFlush(() => {
      this.emitCommonEvents();
    });

    return this.computedState.submittedRecord;
  }

  canUndo() {
    if (this.computedState.canUndo) {
      return true;
    }

    const firstRecord = this.state.undoStack[this.state.undoStack.length - 1];
    if (!firstRecord) {
      return false;
    }

    if (firstRecord.type === 'view') {
      return true;
    }

    // Check if server has any records that's considered part of history
    let revision = firstRecord.revision + 1;
    for (const serverRecord of this.serverFacades.olderIterable(revision)) {
      if (this.context.isExternalTypingHistory(serverRecord)) {
        return true;
      }
      revision = serverRecord.revision;
    }

    return this.serverFacades.hasOlderThan(revision);
  }

  /**
   * Undo last typing.
   * @returns true if undo was successful
   */
  undo(): boolean {
    this.logger?.debug('undo');

    const initialState = this.state;
    this.setCommonEventsInitialState(initialState);

    const undoState = produce(this.state, $recipes.undo(this.props));

    const localTypings = undoState.tmpRecipeResults.localTypings.slice(
      initialState.tmpRecipeResults.localTypings.length
    );

    this.setNextState(produce(undoState, $recipes.resetLocalTypings));

    this.triggerCleanup();

    this.eventPhaseQueue.addAndFlush(() => {
      for (const typing of localTypings) {
        const event = this.createEvent({ typing });
        this.eventBus.emit('undo:applied', event);
        this.eventBus.emit('localTyping:applied', event);
      }

      this.emitCommonEvents();
    });

    return localTypings.length > 0;
  }

  canRedo() {
    return this.computedState.canRedo;
  }

  /**
   * Redo last undone typing.
   * @returns true if redo was successful
   */
  redo(): boolean {
    this.logger?.debug('redo');

    const initialState = this.state;
    this.setCommonEventsInitialState(initialState);

    const redoState = produce(this.state, $recipes.redo(this.props));

    const localTypings = redoState.tmpRecipeResults.localTypings.slice(
      initialState.tmpRecipeResults.localTypings.length
    );

    this.setNextState(produce(redoState, $recipes.resetLocalTypings));

    this.triggerCleanup();

    this.eventPhaseQueue.addAndFlush(() => {
      for (const typing of localTypings) {
        const event = this.createEvent({ typing });
        this.eventBus.emit('redo:applied', event);
        this.eventBus.emit('localTyping:applied', event);
      }

      this.emitCommonEvents();
    });

    return localTypings.length > 0;
  }

  private triggerCleanup() {
    this.limitHistorySize();
    this.cleanupViewChanges();
  }

  /**
   * Ensures history size doesn't exceed the limit
   */
  private limitHistorySize() {
    this.logger?.debug('limitHistorySize');
    this.setNextState(produce(this.state, $recipes.cleanupUndoStack(this.props)));
  }

  private cleanupViewChanges() {
    this.logger?.debug('cleanupViewChanges');
    this.setNextState(produce(this.state, $recipes.removeUnusedViewChanges(this.props)));
  }

  getMissingRevisions() {
    return this.state.missingMessageRevisions;
  }

  toJSON() {
    return this.serialize();
  }

  serialize() {
    return this.context.serializer.serialize(this.state);
  }

  deserialize(serializedState: SerializedState) {
    this.setNextState(this.context.serializer.deserialize(serializedState));
  }

  private recordsRestored() {
    this.eventPhaseQueue.addAndFlush(() => {
      this.eventBus.emit('records:restored', this.createEvent());
    });
  }

  private createEvent(): BaseEvent;
  private createEvent<T>(event: T): T & BaseEvent;
  private createEvent<T>(event?: T): BaseEvent | (T & BaseEvent) {
    return {
      service: this,
      ...event,
    };
  }

  private processIncomingServerMessage(
    incoming?: IncomingServerMessage,
    emitMissingRevisions?: boolean
  ) {
    this.logger?.debug('addIncomingServerMessage', incoming);

    const initialState = this.state;
    this.setCommonEventsInitialState(initialState);

    if (incoming) {
      this.setNextState(produce(this.state, $recipes.addIncomingServerMessage(incoming)));
    }

    // this.setNextState(produce(this.state, $recipes.setPreviousIndex));

    for (const { recipe, ...restProps } of $meals.processQueuedServerMessages(
      this.computedState.asImmutable(),
      this.context
    )) {
      this.logger?.debug('processMessage', {
        ...restProps,
        ...(restProps.type === 'missing-revisions' && {
          missingRevisions: this.state.missingMessageRevisions,
        }),
      });
      this.setNextState(produce(this.state, recipe));
    }

    const externalTypings = this.state.tmpRecipeResults.externalTypings;
    this.setNextState(produce(this.state, $recipes.resetExternalTypings));

    this.triggerCleanup();

    this.eventPhaseQueue.addAndFlush(() => {
      // queuedMessages:missing
      if (this.eventBus.all.has('queuedMessages:missing') || this.eventBus.all.has('*')) {
        const prevMissing = initialState.missingMessageRevisions;
        const currentMissing = this.state.missingMessageRevisions;
        // Emit only if first time missing or range has increased
        if (
          currentMissing &&
          (emitMissingRevisions ||
            !prevMissing ||
            currentMissing.startRevision < prevMissing.startRevision ||
            prevMissing.endRevision < currentMissing.endRevision)
        ) {
          this.eventBus.emit(
            'queuedMessages:missing',
            this.createEvent({ missing: currentMissing })
          );
        }
      }

      for (const typing of externalTypings) {
        const event = this.createEvent({
          typing,
        });
        this.eventBus.emit('externalTyping:applied', this.createEvent(event));
      }

      this.emitCommonEvents();
    });
  }

  private setNextState(nextState: State) {
    // State validation is done only in debug `./utils/debug.ts`
    this.computedState.state = nextState;
  }

  private setCommonEventsInitialState(state: State) {
    if (this.commonEventsInitalState === null) {
      this.commonEventsInitalState = state;
    }
  }

  private emitCommonEvents() {
    const initialState = this.commonEventsInitalState;
    if (!initialState) {
      return;
    }
    this.commonEventsInitalState = null;

    const prev = asComputed(initialState);
    const current = this.computedState;

    const baseEvent = this.createEvent();

    if (!prev.haveSubmittedChanges && current.haveSubmittedChanges) {
      this.eventBus.emit('submittedChanges:have', baseEvent);
    }

    if (prev.haveSubmittedChanges && !current.haveSubmittedChanges) {
      this.eventBus.emit('submittedChanges:acknowledged', baseEvent);
    }

    if (prev.serverRevision !== current.serverRevision) {
      this.eventBus.emit('serverRevision:changed', baseEvent);
    }

    if (!prev.haveLocalChanges && current.haveLocalChanges) {
      this.eventBus.emit('localChanges:have', baseEvent);
    }

    const viewChangeStart =
      initialState.viewChanges.length +
      (current.state.viewIndexOffset - initialState.viewIndexOffset);
    for (const change of current.state.viewChanges.slice(viewChangeStart)) {
      this.eventBus.emit(
        'view:changed',
        this.createEvent({
          change,
        })
      );
    }
  }
}
