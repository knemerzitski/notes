import { createDeferred } from '../../../../utils/src/deferred';

import { Restore, Restorer } from '../types';

export class DeferredRestorer implements Restorer {
  private _status: 'init' | 'restoring' | 'done' = 'init';

  private restorePromise: Promise<void> | undefined;

  private readonly restoreDeferred;

  get status() {
    return this._status;
  }

  constructor(private readonly persistor: Pick<Restore, 'restore'>) {
    this.restoreDeferred = createDeferred();
  }

  /**
   * Calls `persistor.restore()` once. Any further invokes will have no effect.
   * @returns Promise that resolves when restore is done.
   */
  async restore() {
    if (this._status === 'init') {
      this._status = 'restoring';

      this.restorePromise = this.persistor.restore().finally(() => {
        this._status = 'done';
        this.restoreDeferred.resolve();
      });
    }

    return this.restorePromise;
  }

  /**
   * @returns Promise that only resolves when cache has been restored
   */
  async restored() {
    return this.restoreDeferred.promise;
  }
}
