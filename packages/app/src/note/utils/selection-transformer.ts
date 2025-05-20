import { ApolloCache } from '@apollo/client';

import { Logger } from '../../../../utils/src/logging';
import { Maybe } from '../../../../utils/src/types';

import { Changeset, CollabService, Selection } from '../../../../collab/src';

import { gql } from '../../__generated__';
import { Note, User } from '../../__generated__/graphql';
import { getCollabTextRecords } from '../models/record-connection/get';

import { NoteTextFieldEditor } from '../types';

import { getUserNoteLinkId } from './id';

const CollabTextEditingSelection_UserNoteLinkFragment = gql(`
  fragment CollabTextEditingSelection_UserNoteLinkFragment on UserNoteLink {
    id
    open {
      collabTextEditing {
        revision
        latestSelection
      }
    }
  }
`);

interface CommonSelection {
  readonly revision: number;
  readonly selection: Selection;
}

export interface ServerSelection extends CommonSelection {
  readonly type: 'server';
}

export interface ServiceSelection extends CommonSelection {
  readonly type: 'service';
}

export interface EditorSelection extends CommonSelection {
  readonly type: 'editor';
}

type AnySelection = ServerSelection | ServiceSelection | EditorSelection;

export class SelectionTransformer {
  constructor(
    readonly ctx: {
      noteId: Note['id'];
      cache: Pick<ApolloCache<unknown>, 'readQuery' | 'readFragment' | 'identify'>;
      service: CollabService;
      editor: NoteTextFieldEditor;
      logger?: Maybe<Logger>;
    }
  ) {}

  private get noteId() {
    return this.ctx.noteId;
  }

  private get cache() {
    return this.ctx.cache;
  }

  private get service() {
    return this.ctx.service;
  }

  private get editor() {
    return this.ctx.editor;
  }

  private get logger() {
    return this.ctx.logger;
  }

  userAtRevision(userId: User['id'], targetServerRevision: number) {
    const userNoteLink = this.cache.readFragment({
      fragment: CollabTextEditingSelection_UserNoteLinkFragment,
      id: this.cache.identify({
        __typename: 'UserNoteLink',
        id: getUserNoteLinkId(this.noteId, userId),
      }),
    });

    if (!userNoteLink) {
      this.logger?.debug('noUserNoteLink');
      return;
    }

    // No openNote field
    const openNote = userNoteLink.open;
    if (!openNote) {
      this.logger?.debug('notOpen');
      return;
    }

    // Not editing field
    if (!openNote.collabTextEditing) {
      this.logger?.debug('noField:collabTextEditing');
      return;
    }

    // Last known caret position and revision
    let serverSelection: ServerSelection = {
      type: 'server',
      selection: openNote.collabTextEditing.latestSelection,
      revision: openNote.collabTextEditing.revision,
    };

    const initialRevision = serverSelection.revision;
    const revisionOffset = targetServerRevision - initialRevision;

    if (revisionOffset < 0) {
      this.logger?.debug('selectionInFuture');
      // Selection is in the future, cannot transform
      return;
    }

    if (revisionOffset >= 1) {
      const needRecordsCount = revisionOffset;
      const records = getCollabTextRecords(
        this.noteId,
        {
          after: serverSelection.revision,
          first: needRecordsCount,
        },
        this.cache
      );
      if (!records) {
        this.logger?.debug('missingRecords');
        // Missing records, can't transform selection to match current revision
        return;
      }

      for (const record of records) {
        const isOwnRecord = record.author.id === userId;
        if (isOwnRecord) {
          // User selection in collabTextEditing field is old, have record that replaces it
          serverSelection = {
            type: 'server',
            revision: record.revision,
            selection: record.selection,
          };
        } else {
          // Adjust selection to other user record
          serverSelection = {
            type: 'server',
            revision: record.revision,
            selection: serverSelection.selection.follow(record.changeset, true),
          };
        }
      }
    }

    // Ensure selection matches serverRevision
    if (serverSelection.revision !== targetServerRevision) {
      this.logger?.debug('invalidRevision');
      return;
    }

    // Adjust to submitted and local changes?

    return serverSelection;
  }

  editorToServer(editorSelection: EditorSelection): ServerSelection | undefined {
    const serviceSelection = this.editorToService(editorSelection);
    if (!serviceSelection) {
      return;
    }

    return this.serviceToServer(serviceSelection);
  }

  serverToEditor(serverSelection: ServerSelection): EditorSelection | undefined {
    const serviceSelection = this.serverToService(serverSelection);
    if (!serviceSelection) {
      return;
    }

    return this.serviceToEditor(serviceSelection);
  }

  editorToService(editorSelection: EditorSelection): ServiceSelection | undefined {
    if (editorSelection.revision !== this.service.viewRevision) {
      throw new Error(
        `Invalid editorSelection revision "${editorSelection.revision}" does not match Service. Service viewRevision is "${this.service.viewRevision}"`
      );
    }

    const viewSelection = this.editor.toServiceSelection(editorSelection.selection);
    if (!viewSelection) {
      return;
    }

    return {
      type: 'service',
      revision: this.service.viewRevision,
      selection: viewSelection,
    };
  }

  serviceToEditor(serviceSelection: ServiceSelection): EditorSelection | undefined {
    if (serviceSelection.revision !== this.service.viewRevision) {
      throw new Error(
        `Invalid serviceSelection revision "${serviceSelection.revision}" does not match Service. Service viewRevision is "${this.service.viewRevision}"`
      );
    }

    const selection = this.editor.toTyperSelection(serviceSelection.selection);
    if (!selection) {
      return;
    }

    return {
      type: 'editor',
      revision: this.service.viewRevision,
      selection: selection,
    };
  }

  serviceToServer(serviceSelection: ServiceSelection): ServerSelection | undefined {
    if (serviceSelection.revision !== this.service.viewRevision) {
      throw new Error(
        `Invalid serviceSelection revision "${serviceSelection.revision}" does not match Service. Service viewRevision is "${this.service.viewRevision}"`
      );
    }

    const undoLocal = Changeset.inverse(
      this.service.localChanges,
      Changeset.compose(this.service.serverText, this.service.submittedChanges)
    );
    const undoSubmitted = Changeset.inverse(
      this.service.submittedChanges,
      this.service.serverText
    );

    const serverSelection = [undoLocal, undoSubmitted].reduce(
      // TODO is true/left correct?
      (a, b) => a.follow(b, true),
      serviceSelection.selection
    );

    return {
      type: 'server',
      revision: this.service.serverRevision,
      selection: serverSelection,
    };
  }

  serverToService(serverSelection: ServerSelection): ServiceSelection | undefined {
    const updatedServerSelection = this.followServerToRevision(
      serverSelection,
      this.service.serverRevision
    );
    if (!updatedServerSelection) {
      return;
    }

    const selection = [this.service.submittedChanges, this.service.localChanges].reduce(
      // TODO is true/left correct?
      (a, b) => a.follow(b, true),
      updatedServerSelection.selection
    );

    return {
      type: 'service',
      revision: this.service.viewRevision,
      selection,
    };
  }

  private followServerToRevision(
    serverSelection: ServerSelection,
    targetRevision: number
  ): ServerSelection | undefined {
    if (serverSelection.revision === targetRevision) {
      return serverSelection;
    }

    if (serverSelection.revision < targetRevision) {
      const records = getCollabTextRecords(
        this.noteId,
        {
          after: serverSelection.revision,
          first: targetRevision - serverSelection.revision,
        },
        this.cache
      );
      if (!records) {
        return;
      }

      for (const record of records) {
        serverSelection = {
          type: 'server',
          revision: record.revision,
          selection: serverSelection.selection.follow(record.changeset, true),
        };
      }
    } else if (targetRevision < serverSelection.revision) {
      const records = getCollabTextRecords(
        this.noteId,
        {
          before: serverSelection.revision + 1,
          last: targetRevision - serverSelection.revision,
        },
        this.cache
      );
      if (!records) {
        return;
      }

      for (let i = records.length; i >= 0; i--) {
        const record = records[i];
        if (!record) {
          continue;
        }

        serverSelection = {
          type: 'server',
          revision: record.revision,
          selection: serverSelection.selection.follow(record.inverse, true),
        };
      }
    }

    return serverSelection;
  }
}

export function isTypedSelectionEqual(a: AnySelection, b: AnySelection) {
  if (a.type !== b.type) {
    return false;
  }

  if (a.revision !== b.revision) {
    return false;
  }

  return a.selection.isEqual(b.selection);
}
