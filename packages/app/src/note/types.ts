import { CollabTyper } from '../../../collab/src';

import { CollabFacade, CollabServiceManager } from './collab-manager';

export enum NoteTextFieldName {
  TITLE = 't',
  CONTENT = 'c',
}

export type NoteCollabServiceManager = CollabServiceManager<NoteTextFieldName>;

export type NoteCollabFacade = CollabFacade<NoteTextFieldName>;

export type NoteTextFieldEditor = CollabTyper;
