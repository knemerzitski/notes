import mitt, { Emitter } from '~utils/mitt-unsub';

import { Changeset, SerializedChangeset } from '../changeset/changeset';
import { Serializable, assertIsObject } from '~utils/serialize';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CollabClientEvents = {
  viewChange: {
    /**
     * New view changeset that will replace current view.
     */
    newView: Changeset;
    /**
     * Changeset that is about to be composed to view.
     */
    change: Changeset;
    /**
     * What caused view to be changed. Either external or local change.
     */
    source: ChangeSource;
  };
  viewChanged: {
    /**
     * New view changeset.
     */
    view: Changeset;

    /**
     * Changeset that was just composed to view.
     */
    change: Changeset;

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
  Local,
  External,
}

export interface SerializedCollabClient {
  server?: SerializedChangeset;
  submitted?: SerializedChangeset;
  local?: SerializedChangeset;
}

export interface CollabClientOptions {
  eventBus?: Emitter<CollabClientEvents>;

  server?: Changeset;
  submitted?: Changeset;
  local?: Changeset;
  view?: Changeset;
}

export class CollabClient implements Serializable<SerializedCollabClient> {
  readonly eventBus: Emitter<CollabClientEvents>;

  private _server: Changeset;
  get server() {
    return this._server;
  }

  private _submitted: Changeset;
  get submitted() {
    return this._submitted;
  }

  private _local: Changeset;
  get local() {
    return this._local;
  }

  private _view: Changeset;
  get view() {
    return this._view;
  }

  constructor(options?: CollabClientOptions) {
    this.eventBus = options?.eventBus ?? mitt();

    this._server = options?.server ?? Changeset.EMPTY;
    this._submitted = options?.submitted ?? this._server.getIdentity();
    this._local = options?.local ?? this._submitted.getIdentity();
    this._view =
      options?.view ?? this._server.compose(this._submitted).compose(this._local);
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

      this.eventBus.emit('viewChange', {
        newView,
        change,
        source: ChangeSource.Local,
      });

      const hadLocalChanges = this.haveLocalChanges();

      this._local = newLocal;
      this._view = newView;

      this.eventBus.emit('viewChanged', {
        view: this._view,
        change,
        source: ChangeSource.Local,
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
  handleExternalChange(external: Changeset) {
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

    this.eventBus.emit('viewChange', {
      newView,
      change: viewComposable,
      source: ChangeSource.External,
    });

    const event = {
      externalChange: external,
      viewComposable,
      before: this,
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
      source: ChangeSource.External,
    });

    this.eventBus.emit('handledExternalChange', event);

    return event;
  }

  serialize(): SerializedCollabClient {
    return {
      server: !this.server.isEqual(Changeset.EMPTY) ? this.server.serialize() : undefined,
      submitted: this.haveSubmittedChanges() ? this.submitted.serialize() : undefined,
      local: this.haveLocalChanges() ? this.local.serialize() : undefined,
    };
  }

  static parseValue(value: unknown): CollabClientOptions {
    assertIsObject(value);

    const valueMaybe = value as {
      server?: unknown;
      submitted?: unknown;
      local?: unknown;
    };

    return {
      server: Changeset.parseValueMaybe(valueMaybe.server) ?? undefined,
      submitted: Changeset.parseValueMaybe(valueMaybe.submitted) ?? undefined,
      local: Changeset.parseValueMaybe(valueMaybe.local) ?? undefined,
    };
  }
}
