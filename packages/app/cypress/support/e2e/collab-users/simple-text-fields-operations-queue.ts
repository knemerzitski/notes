import mitt, { ReadEmitter } from 'mitt';

import { CollabService } from '../../../../../collab/src';

import { TextOperation } from './types';

export class SimpleTextFieldsOperationsQueue {
  private _eventBus = mitt<{
    doneExecutingOperations: undefined;
  }>();
  get eventBus(): ReadEmitter<{
    doneExecutingOperations: undefined;
  }> {
    return this._eventBus;
  }

  private isExeceutingOperations = false;
  private queue: TextOperation[] = [];
  private prevOperationTime = 0;

  constructor(
    private readonly service: CollabService,
    private readonly submitChanges: () => Promise<void>
  ) {}

  executingOperations() {
    return new Promise<void>((res) => {
      if (this.queue.length === 0) {
        res();
      } else {
        const off = this._eventBus.on('doneExecutingOperations', () => {
          off();
          res();
        });
      }
    });
  }

  pushOperation(op: TextOperation) {
    this.queue.push(op);
    void this.executeAllQueuedOperations();
  }

  /**
   * Execute operations one at a time waiting for submitted record to be acknowledged
   */
  private async executeAllQueuedOperations() {
    if (this.isExeceutingOperations) {
      return;
    }

    this.isExeceutingOperations = true;
    try {
      let op: TextOperation | undefined;
      while ((op = this.queue.shift()) !== undefined) {
        const delay = op.options?.delay ?? 0;

        const timeElapsed = Date.now() - this.prevOperationTime;
        const timeout = delay - timeElapsed;

        if (timeout > 0) {
          await new Promise((res) => {
            setTimeout(res, timeout);
          });
        }

        // Wait for submitted ack
        if (this.service.haveSubmittedChanges()) {
          await new Promise((res) => {
            const off = this.service.on('submittedChanges:acknowledged', () => {
              off();
              res(true);
            });
          });
        }

        this.prevOperationTime = Date.now();

        if (op.type === 'insert') {
          op.simpleField.field.insert(op.value, op.simpleField.selection);
          await this.submitChanges();
        } else if (op.type === 'delete') {
          op.simpleField.field.delete(op.count, op.simpleField.selection);
          await this.submitChanges();
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (op.type === 'selectOffset') {
          const newSelection = op.simpleField.selection.add(op.offset);
          if (!op.simpleField.selection.isEqual(newSelection)) {
            op.simpleField.selection = newSelection;
            op.simpleField.selectionRevision = this.service.serverRevision;
            op.simpleField.eventBus.emit('selectionChanged');
          }
        }
      }
    } finally {
      this.isExeceutingOperations = false;
      this._eventBus.emit('doneExecutingOperations');
    }
  }
}
