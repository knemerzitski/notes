import mitt, { Emitter } from 'mitt';

import { object } from 'superstruct';

import { Logger } from '../../../utils/src/logging';

import { Changeset } from '../changeset';
import { OptionalChangesetStruct } from '../changeset/struct';

export interface CollabClientEvents {
  viewChanged: Readonly<{
    /**
     * New view changeset.
     */
    view: Changeset;

    /**
     * Changeset that was just composed on view.
     * If undefined then view was completely replaced.
     */
    change?: Changeset;

    /**
     * What caused view to change. Either external or local change.
     */
    source: ChangeSource;
  }>;
  haveLocalChanges: Readonly<{
    /**
     * Local changes
     */
    local: Changeset;
  }>;
  submitChanges?: never;
  submittedChangesAcknowledged?: never;
  handledExternalChange: Readonly<{
    /**
     * External change
     */
    externalChange: Changeset;
    /**
     * Changeset that will be composed on view
     */
    viewComposable: Changeset;
    /**
     * State before the change
     */
    before: Readonly<Pick<CollabClient, 'server' | 'submitted' | 'local' | 'view'>>;
    /**
     * State after the change
     */
    after: Readonly<Pick<CollabClient, 'server' | 'submitted' | 'local' | 'view'>>;
  }>;
}

export enum ChangeSource {
  LOCAL,
  EXTERNAL,
  RESET,
}

export const CollabClientOptionsStruct = object({
  server: OptionalChangesetStruct,
  submitted: OptionalChangesetStruct,
  local: OptionalChangesetStruct,
});

export interface CollabClientOptions {
  logger?: Logger;

  eventBus?: Emitter<CollabClientEvents>;

  server?: Changeset;
  submitted?: Changeset;
  local?: Changeset;
  view?: Changeset;
}

export class CollabClient {
  private readonly logger;

  private readonly _eventBus: Emitter<CollabClientEvents>;
  get eventBus(): Pick<Emitter<CollabClientEvents>, 'on' | 'off'> {
    return this._eventBus;
  }

  private _server!: Changeset;
  get server() {
    return this._server;
  }

  private _submitted!: Changeset;
  get submitted() {
    return this._submitted;
  }

  private _local!: Changeset;
  get local() {
    return this._local;
  }

  private _view!: Changeset;
  get view() {
    return this._view;
  }

  constructor(options?: CollabClientOptions) {
    this.logger = options?.logger;

    this._eventBus = options?.eventBus ?? mitt();

    this.reset(options);
  }

  reset(options?: Pick<CollabClientOptions, 'server' | 'submitted' | 'local' | 'view'>) {
    this._server = options?.server ?? Changeset.EMPTY;
    this._submitted = options?.submitted ?? this._server.getIdentity();
    this._local = options?.local ?? this._submitted.getIdentity();
    this._view =
      options?.view ?? this._server.compose(this._submitted).compose(this._local);

    this._eventBus.emit('viewChanged', {
      view: this._view,
      change: this._server,
      source: ChangeSource.RESET,
    });

    this.logState('reset');
  }

  private getSubmittedView() {
    return this._server.compose(this._submitted);
  }

  /**
   * Introduce new local typing by composing {@link change} to
   * local changeset.
   */
  composeLocalChange(change: Changeset) {
    let newLocal = this._local.compose(change);

    // Remove redundant insertions by changing them to retained characters
    const submittedView = this.getSubmittedView();
    newLocal = submittedView.insertionsToRetained(newLocal);

    if (!this._local.isEqual(newLocal)) {
      const newView = this._view.compose(change);

      const hadLocalChanges = this.haveLocalChanges();

      this._local = newLocal;
      this._view = newView;

      this._eventBus.emit('viewChanged', {
        view: this._view,
        change,
        source: ChangeSource.LOCAL,
      });

      if (!hadLocalChanges && this.haveLocalChanges()) {
        this._eventBus.emit('haveLocalChanges', { local: newLocal });
      }
      this.logState('composeLocalChange', {
        args: {
          change: change.toString(),
        },
      });
    }
  }

  haveSubmittedChanges() {
    return !this._submitted.isIdentity(this._server);
  }

  haveLocalChanges() {
    return !this._local.isIdentity(this._submitted);
  }

  canSubmitChanges() {
    return !this.haveSubmittedChanges() && this.haveLocalChanges();
  }

  /**
   *
   * @returns Submitting changes was successful and submittable changes are in
   * {@link submitted}. Returns false if previous submitted changes exist or
   * there are no local changes to submit.
   */
  submitChanges() {
    if (!this.canSubmitChanges()) return false;

    this._submitted = this._local;
    this._local = this._submitted.getIdentity();

    this._eventBus.emit('submitChanges');

    this.logState('submitChanges');

    return true;
  }

  /**
   * Can acknowledge only if submitted changes exist.
   * @returns Acknowlegement successful. Only returns false if submitted changes don't exist.
   */
  submittedChangesAcknowledged() {
    if (!this.haveSubmittedChanges()) return false;

    this._server = this._server.compose(this._submitted);
    this._submitted = this._server.getIdentity();

    this._eventBus.emit('submittedChangesAcknowledged');

    this.logState('submittedChangesAcknowledged');

    return true;
  }

  /**
   * Composes external change to server changeset and updates rest accordingly to match server.
   */
  handleExternalChange(external: Changeset): CollabClientEvents['handledExternalChange'] {
    // A - server, X - submitted, Y - local, B - external,
    // V - view, D - external change relative to view
    // Text before external change: AXY = V
    // Text after external change: A'BX'Y' = VD

    // A' = AB
    const newServer = this._server.compose(external);
    // X' = f(B,X)
    const newSubmitted = external.follow(this._submitted);
    const externalAfterSubmitted = this._submitted.follow(external);
    // Y' = f(f(X,B),Y)
    const newLocal = externalAfterSubmitted.follow(this._local);
    // D =  f(Y,f(X,B))
    const viewComposable = this._local.follow(externalAfterSubmitted);
    // V' = VD
    const newView = this._view.compose(viewComposable);

    const event: CollabClientEvents['handledExternalChange'] = {
      externalChange: external,
      viewComposable,
      before: {
        server: this._server,
        submitted: this._submitted,
        local: this._local,
        view: this._view,
      },
      after: {
        server: newServer,
        submitted: newSubmitted,
        local: newLocal,
        view: newView,
      },
    };

    this._server = newServer;
    this._submitted = newSubmitted;
    this._local = newLocal;
    this._view = newView;

    this._eventBus.emit('viewChanged', {
      view: this._view,
      change: viewComposable,
      source: ChangeSource.EXTERNAL,
    });

    this._eventBus.emit('handledExternalChange', event);

    this.logState('handleExternalChange', {
      args: {
        external: external.toString(),
      },
    });

    return event;
  }

  serialize() {
    return CollabClientOptionsStruct.createRaw({
      server: !this.server.isEqual(Changeset.EMPTY) ? this.server : undefined,
      submitted: this.haveSubmittedChanges() ? this.submitted : undefined,
      local: this.haveLocalChanges() ? this.local : undefined,
    });
  }

  static parseValue(value: unknown): CollabClientOptions {
    return CollabClientOptionsStruct.create(value);
  }

  private logState(message: string, data?: Record<string, unknown>) {
    this.logger?.debug(message, {
      ...data,
      server: this._server.toString(),
      submitted: this._submitted.toString(),
      local: this._local.toString(),
      view: this._view.toString(),
    });
  }
}
