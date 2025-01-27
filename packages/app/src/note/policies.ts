import { PossibleTypesMap } from '@apollo/client';

import { CreateTypePoliciesFn, MutationDefinitions } from '../graphql/types';
import { TaggedEvictOptionsList } from '../graphql/utils/tagged-evict';

import { CreateNote } from './mutations/CreateNote';
import { CreateNoteLinkByShareAccess } from './mutations/CreateNoteLinkByShareAccess';
import { CreateNoteLinkByShareAccessPayload } from './mutations/CreateNoteLinkByShareAccessPayload';
import { CreateNotePayload } from './mutations/CreateNotePayload';
import { DeleteNote } from './mutations/DeleteNote';
import { DeleteNotePayload } from './mutations/DeleteNotePayload';
import { DeleteShareNote } from './mutations/DeleteShareNote';
import { DeleteShareNotePayload } from './mutations/DeleteShareNotePayload';
import { MoveUserNoteLink } from './mutations/MoveUserNoteLink';
import { MoveUserNoteLinkPayload } from './mutations/MoveUserNoteLinkPayload';
import { OpenNoteUserSubscribedEvent } from './mutations/OpenNoteUserSubscribedEvent';
import { OpenNoteUserUnsubscribedEvent } from './mutations/OpenNoteUserUnsubscribedEvent';
import { ShareNote } from './mutations/ShareNote';
import { ShareNotePayload } from './mutations/ShareNotePayload';
import { TrashUserNoteLink } from './mutations/TrashUserNoteLink';
import { TrashUserNoteLinkPayload } from './mutations/TrashUserNoteLinkPayload';
import { UpdateNoteInsertRecord } from './mutations/UpdateNoteInsertRecord';
import { UpdateNoteInsertRecordPayload } from './mutations/UpdateNoteInsertRecordPayload';
import { UpdateOpenNoteSelectionRange } from './mutations/UpdateOpenNoteSelectionRange';
import { UpdateOpenNoteSelectionRangePayload } from './mutations/UpdateOpenNoteSelectionRangePayload';
import { CollabText } from './policies/CollabText';
import { CollabTextEditing } from './policies/CollabTextEditing';
import { CollabTextRecord } from './policies/CollabTextRecord';
import { CollabTextRecordConnection } from './policies/CollabTextRecordConnection';
import { LocalSignedInUser } from './policies/LocalSignedInUser';
import { Note } from './policies/Note';
import { NoteTextField } from './policies/NoteTextField';
import { OpenedNote } from './policies/OpenedNote';
import { PublicUserNoteLink } from './policies/PublicUserNoteLink';
import { evictOptions as Query_evictOptions, Query } from './policies/Query';
import { RevisionChangeset } from './policies/RevisionChangeset';
import { UserNoteLink } from './policies/UserNoteLink';
import { UserNoteLinkConnection } from './policies/UserNoteLinkConnection';
import { SignedInUser } from './policies/SignedInUser';

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
    LocalSignedInUser: LocalSignedInUser(ctx),
    PublicUserNoteLink: PublicUserNoteLink(ctx),
    OpenedNote: OpenedNote(ctx),
    CollabTextEditing: CollabTextEditing(ctx),
    SignedInUser: SignedInUser(ctx),
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
  ShareNote,
  ShareNotePayload,
  DeleteShareNote,
  DeleteShareNotePayload,
  CreateNoteLinkByShareAccess,
  CreateNoteLinkByShareAccessPayload,
  OpenNoteUserSubscribedEvent,
  OpenNoteUserUnsubscribedEvent,
  UpdateOpenNoteSelectionRange,
  UpdateOpenNoteSelectionRangePayload,
];

export const noteEvictOptions: TaggedEvictOptionsList = [...Query_evictOptions];
