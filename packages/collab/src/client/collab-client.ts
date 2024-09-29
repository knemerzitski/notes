import mitt, { Emitter } from 'mitt';
import { Changeset, ChangesetStruct } from '../changeset';
import { object, optional } from 'superstruct';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CollabClientEvents = {
  // TODO make it all readonly....
  viewChanged: {
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
  };
  haveLocalChanges: {
    /**
     * Local changes
     */
    local: Changeset;
  };
  submitChanges?: never;
  submittedChangesAcknowledged?: never;
  handledExternalChange: {
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
    before: Pick<CollabClient, 'server' | 'submitted' | 'local' | 'view'>;
    /**
     * State after the change
     */
    after: Pick<CollabClient, 'server' | 'submitted' | 'local' | 'view'>;
  };
};

export enum ChangeSource {
  LOCAL,
  EXTERNAL,
  RESET,
}

export const CollabClientOptionsStruct = object({
  server: optional(ChangesetStruct),
  submitted: optional(ChangesetStruct),
  local: optional(ChangesetStruct),
});

export interface CollabClientOptions {
  eventBus?: Emitter<CollabClientEvents>;

  server?: Changeset;
  submitted?: Changeset;
  local?: Changeset;
  view?: Changeset;
}

export class CollabClient {
  readonly eventBus: Emitter<CollabClientEvents>;

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
    this.eventBus = options?.eventBus ?? mitt();

    this.reset(options);
  }

  reset(options?: Pick<CollabClientOptions, 'server' | 'submitted' | 'local' | 'view'>) {
    this._server = options?.server ?? Changeset.EMPTY;
    this._submitted = options?.submitted ?? this._server.getIdentity();
    this._local = options?.local ?? this._submitted.getIdentity();
    this._view =
      options?.view ?? this._server.compose(this._submitted).compose(this._local);

    this.eventBus.emit('viewChanged', {
      view: this._view,
      change: this._server,
      source: ChangeSource.RESET,
    });
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

      this.eventBus.emit('viewChanged', {
        view: this._view,
        change,
        source: ChangeSource.LOCAL,
      });

      if (!hadLocalChanges && this.haveLocalChanges()) {
        this.eventBus.emit('haveLocalChanges', { local: newLocal });
      }
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

    this.eventBus.emit('submitChanges');

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

    this.eventBus.emit('submittedChangesAcknowledged');
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

    this.eventBus.emit('viewChanged', {
      view: this._view,
      change: viewComposable,
      source: ChangeSource.EXTERNAL,
    });

    this.eventBus.emit('handledExternalChange', event);

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
}
