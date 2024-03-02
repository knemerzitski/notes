import { Changeset } from '../changeset/changeset';

import { DocumentClient } from './document-client';
import {
  OrderedMessageBuffer,
  OrderedMessageBufferOptions,
} from './ordered-message-buffer';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Messages = {
  submittedChangesAcknowledged?: string;
  externalChange: Changeset;
};

interface DocumentClientRevisionBufferOptions {
  bufferOptions?: OrderedMessageBufferOptions<Messages>;
  document: DocumentClient;
}

/**
 * Handles revisions for DocumentCLient.
 */
export class DocumentClientRevisionBuffer {
  private buffer: OrderedMessageBuffer<Messages>;

  get currentRevision() {
    return this.buffer.currentVersion;
  }

  constructor(options: DocumentClientRevisionBufferOptions) {
    this.buffer = new OrderedMessageBuffer<Messages>(options.bufferOptions);

    const document = options.document;
    this.buffer.bus.on('submittedChangesAcknowledged', () => {
      document.submittedChangesAcknowledged();
    });
    this.buffer.bus.on('externalChange', (externalChange) => {
      document.handleExternalChange(externalChange);
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
