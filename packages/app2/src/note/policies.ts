import { CreateTypePoliciesFn, MutationDefinitions } from '../graphql/types';
import { TaggedEvictOptionsList } from '../graphql/utils/tagged-evict';
import { CreateNote } from './mutations/CreateNote';
import { DeleteNote } from './mutations/DeleteNote';
import { UpdateNoteInsertRecord } from './mutations/UpdateNoteInsertRecord';
import { MoveUserNoteLink } from './mutations/MoveUserNoteLink';
import { TrashUserNoteLink } from './mutations/TrashUserNoteLink';
import { CollabText } from './policies/CollabText';
import { CollabTextRecord } from './policies/CollabTextRecord';
import { CollabTextRecordConnection } from './policies/CollabTextRecordConnection';
import { LocalSignedInUser } from './policies/LocalSignedInUser';
import { Note } from './policies/Note';
import { NoteTextField } from './policies/NoteTextField';
import { evictOptions as Query_evictOptions, Query } from './policies/Query';
import { RevisionChangeset } from './policies/RevisionChangeset';
import { UserNoteLink } from './policies/UserNoteLink';
import { UserNoteLinkConnection } from './policies/UserNoteLinkConnection';
import { UserNoteLinkCreate } from './policies/UserNoteLinkCreate';
import { UpdateNoteInsertRecordPayload } from './mutations/UpdateNoteInsertRecordPayload';
import { TrashUserNoteLinkPayload } from './mutations/TrashUserNoteLinkPayload';
import { MoveUserNoteLinkPayload } from './mutations/MoveUserNoteLinkPayload';
import { DeleteNotePayload } from './mutations/DeleteNotePayload';
import { CreateNotePayload } from './mutations/CreateNotePayload';
import { PossibleTypesMap } from '@apollo/client';

export const notePolicies: CreateTypePoliciesFn = function (ctx) {
  return {
    Query: Query(ctx),
    UserNoteLink: UserNoteLink(ctx),
    Note: Note(ctx),
    NoteTextField: NoteTextField(ctx),
    RevisionChangeset: RevisionChangeset(ctx),
    CollabText: CollabText(ctx),
    CollabTextRecord: CollabTextRecord(ctx),
    CollabTextRecordConnection: CollabTextRecordConnection(ctx),
    UserNoteLinkConnection: UserNoteLinkConnection(ctx),
    UserNoteLinkCreate: UserNoteLinkCreate(ctx),
    LocalSignedInUser: LocalSignedInUser(ctx),
  };
};

export const notePossibleTypes: PossibleTypesMap = {
  UserOperation: [
    'DeleteNoteUserOperation',
    'TrashNoteUserOperation',
    'MoveNoteUserOperation',
  ],
};

export const noteMutationDefinitions: MutationDefinitions = [
  CreateNote,
  CreateNotePayload,
  MoveUserNoteLink,
  MoveUserNoteLinkPayload,
  TrashUserNoteLink,
  TrashUserNoteLinkPayload,
  DeleteNote,
  DeleteNotePayload,
  UpdateNoteInsertRecord,
  UpdateNoteInsertRecordPayload,
];

export const noteEvictOptions: TaggedEvictOptionsList = [...Query_evictOptions];
