import mitt, { Emitter } from 'mitt';

import { Changeset } from '../changeset/changeset';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Events = {
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
  submitChanges?: never;
  submittedChangesAcknowledged?: never;
  handleExternalChange: {
    externalChange: Changeset;
  };
};

export enum ChangeSource {
  Local,
  External,
}

interface DocumentClientOptions {
  initialServerChangeset?: Changeset;
  eventBus?: Emitter<Events>;
}

export class DocumentClient {
  readonly eventBus: Emitter<Events>;

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

  constructor(options?: DocumentClientOptions) {
    const serverChangeset = options?.initialServerChangeset ?? Changeset.EMPTY;
    this.eventBus = options?.eventBus ?? mitt();

    this._server = serverChangeset;
    this._submitted = serverChangeset.getIdentity();
    this._local = serverChangeset.getIdentity();
    this._view = serverChangeset;
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
      this._local = newLocal;

      this._view = this._view.compose(change);
      this.eventBus.emit('viewChanged', {
        view: this._view,
        change: newLocal,
        source: ChangeSource.Local,
      });
    }
  }

  haveSubmittedChanges() {
    return !this._submitted.isIdentity(this._server);
  }

  haveLocalChanges() {
    return !this._local.isIdentity(this._submitted);
  }

  /**
   *
   * @returns Submitting changes was successful and submittable changes are in
   * {@link submitted}. Returns false if previous submitted changes exist or
   * there are no local changes to submit.
   */
  submitChanges() {
    if (this.haveSubmittedChanges() || !this.haveLocalChanges()) return false;

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
    // Document before external change: AXY = V
    // Document after external change: A'BX'Y' = VD

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

    this._server = newServer;
    this._submitted = newSubmitted;
    this._local = newLocal;
    this._view = newView;

    this.eventBus.emit('viewChanged', {
      view: this._view,
      change: viewComposable,
      source: ChangeSource.External,
    });

    this.eventBus.emit('handleExternalChange', {
      externalChange: external,
    });
  }
}