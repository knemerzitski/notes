import mitt, { Emitter } from 'mitt';

import { Changeset } from '../changeset/changeset';

import { DocumentClient } from './document-client';
import {
  OrderedMessageBuffer,
  OrderedMessageBufferOptions,
} from './ordered-message-buffer';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Events = {
  revisionChanged: {
    /**
     * New revision.
     */
    revision: number;
    /**
     * Changeset that matches this revision.
     */
    changeset: Changeset;
  };
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Messages = {
  submittedChangesAcknowledged?: string;
  externalChange: Changeset;
};

interface DocumentClientRevisionBufferOptions {
  bufferOptions?: OrderedMessageBufferOptions<Messages>;
  document: DocumentClient;
  eventBus?: Emitter<Events>;
}

/**
 * Handles revisions for DocumentCLient.
 */
export class DocumentClientRevisionBuffer {
  private buffer: OrderedMessageBuffer<Messages>;
  readonly eventBus;

  get currentRevision() {
    return this.buffer.currentVersion;
  }

  constructor(options: DocumentClientRevisionBufferOptions) {
    this.buffer = new OrderedMessageBuffer<Messages>(options.bufferOptions);

    this.eventBus = options.eventBus ?? mitt();

    const document = options.document;
    this.buffer.bus.on('submittedChangesAcknowledged', () => {
      document.submittedChangesAcknowledged();
    });
    this.buffer.bus.on('externalChange', (externalChange) => {
      document.handleExternalChange(externalChange);
    });

    this.buffer.eventBus.on('messagesProcessed', () => {
      this.eventBus.emit('revisionChanged', {
        revision: this.buffer.currentVersion,
        changeset: document.server,
      });
    });
  }

  /**
   * @param revision Revision of the change.
   */
  addRevision<Key extends keyof Messages>(
    type: Key,
    revision: number,
    message: Messages[Key]
  ): void;
  addRevision<Key extends keyof Messages>(
    type: undefined extends Messages[Key] ? Key : never,
    revision: number
  ): void;
  addRevision<Key extends keyof Messages>(
    type: Key,
    revision: number,
    message?: Messages[Key]
  ) {
    this.buffer.add(type, revision, message);
  }
}
