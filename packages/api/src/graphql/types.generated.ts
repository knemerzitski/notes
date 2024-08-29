import { Changeset } from '~collab/changeset/changeset';
import { ObjectId } from 'mongodb';
import { GraphQLResolveInfo, SelectionSetNode, FieldNode, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { CollabTextMapper, CollabTextRecordMapper, CollabTextRecordConnectionMapper, CollabTextRecordEdgeMapper, CollabTextSelectionRangeMapper, RevisionChangesetMapper } from './domains/collab/schema.mappers';
import { NoteMapper } from './__EXCLUDE/note/schema.mappers';
import { NoteCollabMapper, NoteTextFieldEntryMapper } from './domains/note-collab/schema.mappers';
import { NotePreferencesMapper, PublicUserNoteLinkMapper, UserNoteLinkMapper, UserNoteLinkConnectionMapper, UserNoteLinkEdgeMapper } from './domains/note-user-link/schema.mappers';
import { PageInfoMapper } from './domains/base/schema.mappers';
import { PublicUserMapper, PublicUserProfileMapper, SignedInUserMapper } from './user/schema.mappers';
import { GraphQLResolversContext } from './types';
import { MaybeValue } from '~utils/types';
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type ResolverFn<TResult, TParent, TContext, TArgs> = (parent: TParent, args: TArgs, context: TContext, info: GraphQLResolveInfo) => MaybeValue<TResult>
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string | number; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Changeset: { input: Changeset; output: Changeset; }
  /** Relay pagination cursor */
  Cursor: { input: string | number; output: string | number; }
  DateTime: { input: Date | string; output: Date | string; }
  /** Coloar in range #000000 - #ffffff */
  HexColorCode: { input: string; output: string; }
  /** int >= 0 */
  NonNegativeInt: { input: number; output: number; }
  /** MongoDB ObjectId */
  ObjectID: { input: ObjectId; output: ObjectId; }
  /** int > 0 */
  PositiveInt: { input: number; output: number; }
};

export type AlreadySignedInResult = SignInResult & {
  __typename?: 'AlreadySignedInResult';
  /** Current available SignedInUser.id's */
  availableUserIds: Array<Scalars['String']['output']>;
  /** Current already signed in user */
  signedInUser: SignedInUser;
};

/** User info received from authentication provider */
export type AuthProviderUser = {
  __typename?: 'AuthProviderUser';
  /** User email. Not stored in database and only available with sign in payload. */
  email: Scalars['String']['output'];
  /** User ID */
  id: Scalars['ID']['output'];
};

export type CollabText = {
  __typename?: 'CollabText';
  /** Latest revision of this text. */
  headText: RevisionChangeset;
  /** Self-descriptive */
  id: Scalars['ID']['output'];
  /** A list of records containing all changes made to the text */
  recordConnection: CollabTextRecordConnection;
  /** Oldest available revision of this text. tailText.compose(...records) => headText */
  tailText: RevisionChangeset;
  /** Text at specific revision. Is a composition of all previous changesets. */
  textAtRevision: RevisionChangeset;
};


export type CollabTextrecordConnectionArgs = {
  after?: InputMaybe<Scalars['NonNegativeInt']['input']>;
  before?: InputMaybe<Scalars['NonNegativeInt']['input']>;
  first?: InputMaybe<Scalars['PositiveInt']['input']>;
  last?: InputMaybe<Scalars['PositiveInt']['input']>;
};


export type CollabTexttextAtRevisionArgs = {
  revision: Scalars['NonNegativeInt']['input'];
};

export type CollabTextRecord = Node & {
  __typename?: 'CollabTextRecord';
  /** Selection after changeset is composed */
  afterSelection: CollabTextSelectionRange;
  /** Selection before changeset is composed */
  beforeSelection: CollabTextSelectionRange;
  /** Changes this record makes to the text */
  change: RevisionChangeset;
  /** Time when this record was created */
  createdAt: Scalars['DateTime']['output'];
  /** User who created this record */
  creatorUser: PublicUser;
  /** Self-descriptive */
  id: Scalars['ID']['output'];
};

export type CollabTextRecordConnection = Connection & {
  __typename?: 'CollabTextRecordConnection';
  /** Self descriptive */
  edges: Array<CollabTextRecordEdge>;
  /** Self descriptive */
  pageInfo: PageInfo;
  /** Records directly without edges */
  records: Array<CollabTextRecord>;
};

export type CollabTextRecordEdge = Edge & {
  __typename?: 'CollabTextRecordEdge';
  /** Self descriptive */
  cursor: Scalars['Cursor']['output'];
  /** Self descriptive */
  node: CollabTextRecord;
};

export type CollabTextRecordInput = {
  /** Selection after change is composed */
  afterSelection: CollabTextSelectionRangeInput;
  /** Selection before change is composed */
  beforeSelection: CollabTextSelectionRangeInput;
  /** Change to be made on the text */
  change: RevisionChangesetInput;
  /** Randomly generated string by client */
  generatedId: Scalars['String']['input'];
};

export type CollabTextSelectionRange = {
  __typename?: 'CollabTextSelectionRange';
  /** End index of selection. If null then start === end. */
  end?: Maybe<Scalars['NonNegativeInt']['output']>;
  /** Start index of selection */
  start: Scalars['NonNegativeInt']['output'];
};

export type CollabTextSelectionRangeInput = {
  /** End index of selection. If null then start === end. */
  end?: InputMaybe<Scalars['NonNegativeInt']['input']>;
  /** Start index of selection */
  start: Scalars['NonNegativeInt']['input'];
};

export type Connection = {
  /** Self descriptive */
  edges: Array<Maybe<Edge>>;
  /** Self descriptive */
  pageInfo: PageInfo;
};

export type CreateCollabTextInput = {
  /** Self-descriptive */
  initialText: Scalars['String']['input'];
};

export type CreateNoteCollabInput = {
  /** Initial note text fields */
  textFields?: InputMaybe<Array<CreateNoteTextFieldEntryInput>>;
};

export type CreateNoteInput = {
  /** Initial note collaboration values */
  collab?: InputMaybe<CreateNoteCollabInput>;
  userNoteLink?: InputMaybe<CreateUserNoteLinkInput>;
};

export type CreateNoteLinkByShareAccessInput = {
  /** Create NoteUserLink by NoteShareAccess.id */
  shareAccessId: Scalars['ObjectID']['input'];
};

export type CreateNoteLinkByShareAccessPayload = {
  __typename?: 'CreateNoteLinkByShareAccessPayload';
  /** Created UserNoteLink by the share access */
  userNoteLink: UserNoteLink;
};

export type CreateNotePayload = {
  __typename?: 'CreateNotePayload';
  note: Note;
  /** Created link to a new note */
  userNoteLink: UserNoteLink;
};

export type CreateNoteTextFieldEntryInput = {
  /** Type of text field */
  key: NoteTextField;
  /** Actual value of text field */
  value: CreateCollabTextInput;
};

export type CreateUserNoteLinkInput = {
  categoryName?: InputMaybe<NoteCategory>;
  preferences?: InputMaybe<NotePreferencesInput>;
};

export type DeleteNoteInput = {
  /** Note to be deleted by Note.id */
  noteId: Scalars['ObjectID']['input'];
  /** Delete note for specific user instead of current user. Current must have higher scope/permissions. */
  userId?: InputMaybe<Scalars['ObjectID']['input']>;
};

export type DeleteNotePayload = {
  __typename?: 'DeleteNotePayload';
  /** Deleted Note.id */
  noteId?: Maybe<Scalars['ObjectID']['output']>;
  /** Deleted PublicUserNoteLink.id */
  publicUserNoteLinkId?: Maybe<Scalars['String']['output']>;
  /** Deleted UserNoteLink.id */
  userNoteLinkId?: Maybe<Scalars['String']['output']>;
};

export type DeleteNoteSharePayload = {
  __typename?: 'DeleteNoteSharePayload';
  /** Note with shareAccess deleted */
  note: Note;
  /** Id of deleted NoteShareAccess.id */
  shareAccessId: Scalars['ObjectID']['output'];
};

export type DeleteShareNoteInput = {
  /** Note to to stop sharing, Note.id */
  noteId: Scalars['ObjectID']['input'];
};

export type Edge = {
  /** Self descriptive */
  cursor: Scalars['Cursor']['output'];
  /** Self descriptive */
  node: Node;
};

export type GoogleJWTAuthInput = {
  /** JSON Web Token */
  token: Scalars['String']['input'];
};

export type JustSignedInResult = SignInResult & {
  __typename?: 'JustSignedInResult';
  /** User info from auth provider */
  authProviderUser: AuthProviderUser;
  /** Available SignedInUser.id's after sign in */
  availableUserIds: Array<Scalars['String']['output']>;
  /** Just signed in user */
  signedInUser: SignedInUser;
};

export enum ListAnchorPosition {
  AFTER = 'AFTER',
  BEFORE = 'BEFORE'
}

/** Notes in these categories can be moved/reordered */
export enum MovableNoteCategory {
  ARCHIVE = 'ARCHIVE',
  DEFAULT = 'DEFAULT',
  STICKY = 'STICKY'
}

export type MoveUserNoteLinkInput = {
  /** Specify how to move the note. Null location can be used to move note out of trash back to original category. */
  location?: InputMaybe<NoteLocationInput>;
  /** Note to be moved by Note.id */
  noteId: Scalars['ObjectID']['input'];
};

export type MoveUserNoteLinkPayload = {
  __typename?: 'MoveUserNoteLinkPayload';
  /** How note was moved */
  location: NoteLocation;
  /** UserNoteLink after the move */
  userNoteLink: UserNoteLink;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Create a new note */
  createNote?: Maybe<CreateNotePayload>;
  /** Add a link to an existing note for collaborative editing */
  createNoteLinkByShareAccess: CreateNoteLinkByShareAccessPayload;
  /** Deletes note for oldest user (cannot be undone). Newer users can only unlink the note. */
  deleteNote: DeleteNotePayload;
  /** Stop new access to note. Existing users can still access the note. */
  deleteShareNote: DeleteNoteSharePayload;
  /** Move note between categories or reorder within categories */
  moveUserNoteLink: MoveUserNoteLinkPayload;
  /** Share existing note */
  shareNote: ShareNotePayload;
  /** Sign in using an auth provider */
  signIn: SignInPayload;
  /** Sign out a user */
  signOut: SignOutPayload;
  /** Synchronize http-only session cookies. Only sessions available both in client and server are kept. */
  syncSessionCookies: SyncSessionCookiesPayload;
  /** Trash note by Note.id. It can still be recovered by moving it out of trash */
  trashUserNoteLink: TrashUserNoteLinkPayload;
  updateNoteEditorSelectionRange: UpdateNoteEditorSelectionRangePayload;
  /** Insert new record to text field */
  updateNoteTextFieldInsertRecord: UpdateNoteTextFieldInsertRecordPayload;
  updateSignedInUserDisplayName: UpdateSignedInUserDisplayNamePayload;
  /** Update note preferences backgroundColor */
  updateUserNoteLinkBackgroundColor: UpdateUserNoteLinkBackgroundColorPayload;
  /** Change user note permissions */
  updateUserNoteLinkReadOnly: UpdateUserNoteLinkReadOnlyPayload;
};


export type MutationcreateNoteArgs = {
  input: CreateNoteInput;
};


export type MutationcreateNoteLinkByShareAccessArgs = {
  input: CreateNoteLinkByShareAccessInput;
};


export type MutationdeleteNoteArgs = {
  input: DeleteNoteInput;
};


export type MutationdeleteShareNoteArgs = {
  input: DeleteShareNoteInput;
};


export type MutationmoveUserNoteLinkArgs = {
  input: MoveUserNoteLinkInput;
};


export type MutationshareNoteArgs = {
  input: ShareNoteInput;
};


export type MutationsignInArgs = {
  input: SignInInput;
};


export type MutationsignOutArgs = {
  input?: InputMaybe<SignOutInput>;
};


export type MutationsyncSessionCookiesArgs = {
  input: SyncSessionCookiesInput;
};


export type MutationtrashUserNoteLinkArgs = {
  input: TrashUserNoteLinkInput;
};


export type MutationupdateNoteEditorSelectionRangeArgs = {
  input?: InputMaybe<UpdateNoteEditorSelectionRangeInput>;
};


export type MutationupdateNoteTextFieldInsertRecordArgs = {
  input: UpdateNoteTextFieldInsertRecordInput;
};


export type MutationupdateSignedInUserDisplayNameArgs = {
  input: UpdateSignedInUserDisplayNameInput;
};


export type MutationupdateUserNoteLinkBackgroundColorArgs = {
  input: UpdateUserNoteLinkBackgroundColorInput;
};


export type MutationupdateUserNoteLinkReadOnlyArgs = {
  input: UpdateUserNoteLinkReadOnlyInput;
};

export type Node = {
  /** Self descriptive */
  id: Scalars['ID']['output'];
};

export type Note = {
  __typename?: 'Note';
  /** Note collaboration */
  collab: NoteCollab;
  /** Self-descriptive */
  id: Scalars['ObjectID']['output'];
  /** Note is shared through this access */
  shareAccess?: Maybe<NoteShareAccess>;
  /** All users who can access the note. */
  users: Array<PublicUserNoteLink>;
};

/** All note categories */
export enum NoteCategory {
  ARCHIVE = 'ARCHIVE',
  DEFAULT = 'DEFAULT',
  STICKY = 'STICKY',
  TRASH = 'TRASH'
}

/** Note collaborative info */
export type NoteCollab = {
  __typename?: 'NoteCollab';
  /** All available text fields. If arg: name is defined then only that field is returned. */
  textFields: Array<NoteTextFieldEntry>;
  /** Any collaborative field last updated time */
  updatedAt: Scalars['DateTime']['output'];
};


/** Note collaborative info */
export type NoteCollabtextFieldsArgs = {
  name?: InputMaybe<NoteTextField>;
};

export type NoteEditorEventsPayload = {
  __typename?: 'NoteEditorEventsPayload';
  /** Self-descriptive */
  mutations: Array<NoteEditorMutations>;
};

export type NoteEditorMutations = UpdateNoteEditorSelectionRangePayload;

export type NoteEditorUserSubscribedEvent = {
  __typename?: 'NoteEditorUserSubscribedEvent';
  /** Affected Note */
  note: Note;
  /** This user started subscribing to note editor events. */
  user: PublicUser;
};

export type NoteEditorUserUnsubscribedEvent = {
  __typename?: 'NoteEditorUserUnsubscribedEvent';
  /** Affected Note */
  note: Note;
  /** This user stopped subscribing to note editor events. */
  user: PublicUser;
};

export type NoteLocation = {
  __typename?: 'NoteLocation';
  /** How note is positioned relative to anchorNote. Default is BEFORE */
  anchorPosition?: Maybe<ListAnchorPosition>;
  /** Anchor note after moving */
  anchorUserNoteLink?: Maybe<UserNoteLink>;
  /** Note category after moving */
  categoryName: MovableNoteCategory;
};

/** Move notes between categories or within category using anchor note */
export type NoteLocationInput = {
  /**
   * Note.id to be defined as anchor.
   * If anchor note doesn't exist then anchor is ignored and note is appended to the end.
   */
  anchorNoteId?: InputMaybe<Scalars['ObjectID']['input']>;
  /** How note is moved relative to anchor note */
  anchorPosition?: InputMaybe<ListAnchorPosition>;
  /** Category where to put or keep the note. */
  categoryName: MovableNoteCategory;
};

export type NotePreferences = {
  __typename?: 'NotePreferences';
  /** Note background color */
  backgroundColor?: Maybe<Scalars['HexColorCode']['output']>;
};

export type NotePreferencesInput = {
  backgroundColor?: InputMaybe<Scalars['HexColorCode']['input']>;
};

export type NoteShareAccess = {
  __typename?: 'NoteShareAccess';
  /** Note is accessible by this id */
  id: Scalars['ObjectID']['output'];
  /** Access to note through this share is read-only. Read-only note cannot be modified. */
  readOnly: Scalars['Boolean']['output'];
};

export enum NoteTextField {
  CONTENT = 'CONTENT',
  TITLE = 'TITLE'
}

export type NoteTextFieldEntry = {
  __typename?: 'NoteTextFieldEntry';
  /** Type of text field */
  key: NoteTextField;
  /** Actual value of text field */
  value: CollabText;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  /** Self descriptive */
  endCursor?: Maybe<Scalars['Cursor']['output']>;
  /** Self descriptive */
  hasNextPage: Scalars['Boolean']['output'];
  /** Self descriptive */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** Self descriptive */
  startCursor?: Maybe<Scalars['Cursor']['output']>;
};

export type PublicUser = {
  __typename?: 'PublicUser';
  /** Same value as SignedInUser.id */
  id: Scalars['ObjectID']['output'];
  /** Self-descriptive */
  profile: PublicUserProfile;
};

export type PublicUserNoteLink = {
  __typename?: 'PublicUserNoteLink';
  /** Time when user gained access to the note */
  createdAt: Scalars['DateTime']['output'];
  /** User is currently subscribed to noteEditorEvents */
  editing: Scalars['Boolean']['output'];
  /** Self-descriptive */
  id: Scalars['ID']['output'];
  /** Access to note is read-only. User cannot modify note. */
  readOnly: Scalars['Boolean']['output'];
  /** Public user who can access the note */
  user: PublicUser;
};

export type PublicUserProfile = {
  __typename?: 'PublicUserProfile';
  /** Text to be displayed in UI to distinguish this user. Can be anything set by the user. */
  displayName: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Get currently signed in user */
  signedInUser: SignedInUser;
  /** Find UserNoteLink by Note.id */
  userNoteLinkByNoteId: UserNoteLink;
  /** Paginate UserNoteLinks by category. Default is NoteCategory.DEFAULT */
  userNoteLinkConnection: UserNoteLinkConnection;
  /** Search for UserNoteLinks by text */
  userNoteLinkSearchConnection: UserNoteLinkConnection;
};


export type QueryuserNoteLinkByNoteIdArgs = {
  noteId: Scalars['ObjectID']['input'];
};


export type QueryuserNoteLinkConnectionArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<NoteCategory>;
  first?: InputMaybe<Scalars['NonNegativeInt']['input']>;
  last?: InputMaybe<Scalars['NonNegativeInt']['input']>;
};


export type QueryuserNoteLinkSearchConnectionArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['NonNegativeInt']['input']>;
  last?: InputMaybe<Scalars['NonNegativeInt']['input']>;
  searchText: Scalars['String']['input'];
};

export type RevisionChangeset = {
  __typename?: 'RevisionChangeset';
  /** A set of text changes */
  changeset: Scalars['Changeset']['output'];
  /** Revision number */
  revision: Scalars['NonNegativeInt']['output'];
};

export type RevisionChangesetInput = {
  /** New changes to be applied to text */
  changeset: Scalars['Changeset']['input'];
  /** Changeset applies to text at this revision */
  revision: Scalars['NonNegativeInt']['input'];
};

export enum Role {
  USER = 'USER'
}

export type ShareNoteInput = {
  /** Note to be shared, Note.id */
  noteId: Scalars['ObjectID']['input'];
  /** Make access to note read-only */
  readOnly: Scalars['Boolean']['input'];
};

export type ShareNotePayload = {
  __typename?: 'ShareNotePayload';
  /** Note where new share access has been added */
  note: Note;
  /** Note sharing access info */
  shareAccess: NoteShareAccess;
};

export type SignInInput = {
  auth: GoogleJWTAuthInput;
};

export type SignInPayload = AlreadySignedInResult | JustSignedInResult;

export type SignInResult = {
  /** SignedInUser.id's */
  availableUserIds: Array<Scalars['String']['output']>;
  /** Signed in user */
  signedInUser: SignedInUser;
};

export type SignOutInput = {
  /** Sign out all known users. Field 'userId' is ignored when 'allUsers' is true */
  allUsers?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sign out a specific user by SignedInUser.id. If userId is not specified currently authenticated user is signed out. */
  userId?: InputMaybe<Scalars['ObjectID']['input']>;
};

export type SignOutPayload = {
  __typename?: 'SignOutPayload';
  /** Available SignedInUser.id's after sign out. */
  availableUserIds: Array<Scalars['String']['output']>;
  /** SignedInUser.id's that were signed out. */
  signedOutUserIds: Array<Scalars['String']['output']>;
};

/** User info that current user itself can access */
export type SignedInUser = {
  __typename?: 'SignedInUser';
  /** Self-descriptive */
  id: Scalars['ObjectID']['output'];
  /** User data that might be accessed by other users */
  public: PublicUser;
};

export type SignedInUserEventsPayload = {
  __typename?: 'SignedInUserEventsPayload';
  /** A list of mutations to be applied on currently signed in user */
  mutations?: Maybe<Array<SignedInUserMutations>>;
};

export type SignedInUserMutations = CreateNoteLinkByShareAccessPayload | CreateNotePayload | DeleteNotePayload | DeleteNoteSharePayload | MoveUserNoteLinkPayload | NoteEditorUserSubscribedEvent | NoteEditorUserUnsubscribedEvent | ShareNotePayload | TrashUserNoteLinkPayload | UpdateNoteTextFieldInsertRecordPayload | UpdateSignedInUserDisplayNamePayload | UpdateUserNoteLinkBackgroundColorPayload | UpdateUserNoteLinkReadOnlyPayload;

export type Subscription = {
  __typename?: 'Subscription';
  /** Subscribe to all events that are related to editing of specific note */
  noteEditorEvents: NoteEditorEventsPayload;
  /** Subscribe to all events that are related to currently signed in user */
  signedInUserEvents: SignedInUserEventsPayload;
};


export type SubscriptionnoteEditorEventsArgs = {
  noteId: Scalars['ObjectID']['input'];
};

export type SyncSessionCookiesInput = {
  /** Available user ids provided by the client */
  availableUserIds: Array<Scalars['String']['input']>;
};

export type SyncSessionCookiesPayload = {
  __typename?: 'SyncSessionCookiesPayload';
  /** User ids available in http-only cookies. Any other user id is expired. */
  availableUserIds: Array<Scalars['String']['output']>;
};

export type TrashUserNoteLinkInput = {
  /** Note to be trashed by Note.id */
  noteId: Scalars['ObjectID']['input'];
};

export type TrashUserNoteLinkPayload = {
  __typename?: 'TrashUserNoteLinkPayload';
  /** Time when note is permanently deleted from trash */
  deletedAt: Scalars['DateTime']['output'];
  /** UserNoteLink after it's been trashed. */
  userNoteLink: UserNoteLink;
};

export type UpdateNoteEditorSelectionRangeInput = {
  /** Note.id  */
  noteId: Scalars['ObjectID']['input'];
  /** Selection applies to this revision of text */
  revision: Scalars['NonNegativeInt']['input'];
  /** New selection range */
  selectionRange: CollabTextSelectionRangeInput;
  /** Text field where selection range is applied */
  textField: NoteTextField;
};

export type UpdateNoteEditorSelectionRangePayload = {
  __typename?: 'UpdateNoteEditorSelectionRangePayload';
  /** Affected CollabText */
  collabText: CollabText;
  /** Latest updated selection range */
  latestSelection: CollabTextSelectionRange;
  /** Affected Note */
  note: Note;
  /** latestSelection applies to text at this revision */
  revision: Scalars['NonNegativeInt']['output'];
  /** Affected text field */
  textField: NoteTextField;
  /** Selection applies to this user */
  user: PublicUser;
};

export type UpdateNoteTextFieldInsertRecordInput = {
  /** New record to be inserted */
  insertRecord: CollabTextRecordInput;
  /** Note to be updated by Note.id */
  noteId: Scalars['ObjectID']['input'];
  /** Text field where to insert record */
  textField: NoteTextField;
};

export type UpdateNoteTextFieldInsertRecordPayload = {
  __typename?: 'UpdateNoteTextFieldInsertRecordPayload';
  /** CollabText after new record is inserted */
  collabText: CollabText;
  /** True if record has already been inserted before. Is always false in subscription. */
  isDuplicateRecord: Scalars['Boolean']['output'];
  /** New record added to text field. Could be a duplicate record. Check isDuplicateRecord field. */
  newRecord: CollabTextRecord;
  /** Note after new record is inserted */
  note: Note;
  /** Text field that was updated */
  textField: NoteTextField;
};

export type UpdateSignedInUserDisplayNameInput = {
  /** New display name */
  displayName: Scalars['String']['input'];
};

export type UpdateSignedInUserDisplayNamePayload = {
  __typename?: 'UpdateSignedInUserDisplayNamePayload';
  /** New updated display name */
  displayName: Scalars['String']['output'];
  /** User after setting new display name */
  signedInUser: SignedInUser;
};

export type UpdateUserNoteLinkBackgroundColorInput = {
  /** New background color value */
  backgroundColor: Scalars['HexColorCode']['input'];
  /** UserNoteLink to be updated by Note.id */
  noteId: Scalars['ObjectID']['input'];
};

export type UpdateUserNoteLinkBackgroundColorPayload = {
  __typename?: 'UpdateUserNoteLinkBackgroundColorPayload';
  /** Direct access to new background color */
  backgroundColor: Scalars['HexColorCode']['output'];
  /** UserNoteLink after new background color is applied */
  userNoteLink: UserNoteLink;
};

export type UpdateUserNoteLinkReadOnlyInput = {
  /** Target Note.id */
  noteId: Scalars['ObjectID']['input'];
  /** New PublicUserNoteLink.readOnly value for PublicUser.id */
  readOnly: Scalars['Boolean']['input'];
  /** Target User.id */
  userId: Scalars['ObjectID']['input'];
};

export type UpdateUserNoteLinkReadOnlyPayload = {
  __typename?: 'UpdateUserNoteLinkReadOnlyPayload';
  /** Related Note */
  note: Note;
  /** Affected PublicUserNoteLink */
  publicUserNoteLink: PublicUserNoteLink;
  /** New PublicUserNoteLink.readOnly value */
  readOnly: Scalars['Boolean']['output'];
  /** PublicUserNoteLink.user */
  user: PublicUser;
};

/** Link (edge) between signed in user and note. */
export type UserNoteLink = Node & {
  __typename?: 'UserNoteLink';
  /** Category where note belongs */
  categoryName: NoteCategory;
  /** UserNoteLink is marked for deletion and will no longer be available after this date. */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Self-descriptive */
  id: Scalars['ID']['output'];
  /** Note that the user can access */
  note: Note;
  /** Note preferences for visual appearance */
  preferences?: Maybe<NotePreferences>;
  /** UserNoteLink data that might be accessed by other users */
  public: PublicUserNoteLink;
};

export type UserNoteLinkConnection = Connection & {
  __typename?: 'UserNoteLinkConnection';
  /** Self descriptive */
  edges: Array<UserNoteLinkEdge>;
  /** Self descriptive */
  pageInfo: PageInfo;
  /** Notes directly without edges */
  userNoteLinks: Array<UserNoteLink>;
};

export type UserNoteLinkEdge = Edge & {
  __typename?: 'UserNoteLinkEdge';
  /** Self descriptive */
  cursor: Scalars['Cursor']['output'];
  /** Self descriptive */
  node: UserNoteLink;
};



export type ResolverTypeWrapper<T> = MaybeValue<T>;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type LegacyStitchingResolver<TResult, TParent, TContext, TArgs> = {
  fragment: string;
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type NewStitchingResolver<TResult, TParent, TContext, TArgs> = {
  selectionSet: string | ((fieldNode: FieldNode) => SelectionSetNode);
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type StitchingResolver<TResult, TParent, TContext, TArgs> = LegacyStitchingResolver<TResult, TParent, TContext, TArgs> | NewStitchingResolver<TResult, TParent, TContext, TArgs>;
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>
  | StitchingResolver<TResult, TParent, TContext, TArgs>;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> = {
  NoteEditorMutations: ( Omit<UpdateNoteEditorSelectionRangePayload, 'collabText' | 'latestSelection' | 'note' | 'user'> & { collabText: _RefType['CollabText'], latestSelection: _RefType['CollabTextSelectionRange'], note: _RefType['Note'], user: _RefType['PublicUser'] } & { __typename: 'UpdateNoteEditorSelectionRangePayload' } );
  SignInPayload: ( Omit<AlreadySignedInResult, 'signedInUser'> & { signedInUser: _RefType['SignedInUser'] } & { __typename: 'AlreadySignedInResult' } ) | ( Omit<JustSignedInResult, 'signedInUser'> & { signedInUser: _RefType['SignedInUser'] } & { __typename: 'JustSignedInResult' } );
  SignedInUserMutations: ( Omit<CreateNoteLinkByShareAccessPayload, 'userNoteLink'> & { userNoteLink: _RefType['UserNoteLink'] } & { __typename: 'CreateNoteLinkByShareAccessPayload' } ) | ( Omit<CreateNotePayload, 'note' | 'userNoteLink'> & { note: _RefType['Note'], userNoteLink: _RefType['UserNoteLink'] } & { __typename: 'CreateNotePayload' } ) | ( DeleteNotePayload & { __typename: 'DeleteNotePayload' } ) | ( Omit<DeleteNoteSharePayload, 'note'> & { note: _RefType['Note'] } & { __typename: 'DeleteNoteSharePayload' } ) | ( Omit<MoveUserNoteLinkPayload, 'location' | 'userNoteLink'> & { location: _RefType['NoteLocation'], userNoteLink: _RefType['UserNoteLink'] } & { __typename: 'MoveUserNoteLinkPayload' } ) | ( Omit<NoteEditorUserSubscribedEvent, 'note' | 'user'> & { note: _RefType['Note'], user: _RefType['PublicUser'] } & { __typename: 'NoteEditorUserSubscribedEvent' } ) | ( Omit<NoteEditorUserUnsubscribedEvent, 'note' | 'user'> & { note: _RefType['Note'], user: _RefType['PublicUser'] } & { __typename: 'NoteEditorUserUnsubscribedEvent' } ) | ( Omit<ShareNotePayload, 'note'> & { note: _RefType['Note'] } & { __typename: 'ShareNotePayload' } ) | ( Omit<TrashUserNoteLinkPayload, 'userNoteLink'> & { userNoteLink: _RefType['UserNoteLink'] } & { __typename: 'TrashUserNoteLinkPayload' } ) | ( Omit<UpdateNoteTextFieldInsertRecordPayload, 'collabText' | 'newRecord' | 'note'> & { collabText: _RefType['CollabText'], newRecord: _RefType['CollabTextRecord'], note: _RefType['Note'] } & { __typename: 'UpdateNoteTextFieldInsertRecordPayload' } ) | ( Omit<UpdateSignedInUserDisplayNamePayload, 'signedInUser'> & { signedInUser: _RefType['SignedInUser'] } & { __typename: 'UpdateSignedInUserDisplayNamePayload' } ) | ( Omit<UpdateUserNoteLinkBackgroundColorPayload, 'userNoteLink'> & { userNoteLink: _RefType['UserNoteLink'] } & { __typename: 'UpdateUserNoteLinkBackgroundColorPayload' } ) | ( Omit<UpdateUserNoteLinkReadOnlyPayload, 'note' | 'publicUserNoteLink' | 'user'> & { note: _RefType['Note'], publicUserNoteLink: _RefType['PublicUserNoteLink'], user: _RefType['PublicUser'] } & { __typename: 'UpdateUserNoteLinkReadOnlyPayload' } );
};

/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
  Connection: ( CollabTextRecordConnectionMapper & { __typename: 'CollabTextRecordConnection' } ) | ( UserNoteLinkConnectionMapper & { __typename: 'UserNoteLinkConnection' } );
  Edge: ( CollabTextRecordEdgeMapper & { __typename: 'CollabTextRecordEdge' } ) | ( UserNoteLinkEdgeMapper & { __typename: 'UserNoteLinkEdge' } );
  Node: ( CollabTextRecordMapper & { __typename: 'CollabTextRecord' } ) | ( UserNoteLinkMapper & { __typename: 'UserNoteLink' } );
  SignInResult: ( Omit<AlreadySignedInResult, 'signedInUser'> & { signedInUser: _RefType['SignedInUser'] } & { __typename: 'AlreadySignedInResult' } ) | ( Omit<JustSignedInResult, 'signedInUser'> & { signedInUser: _RefType['SignedInUser'] } & { __typename: 'JustSignedInResult' } );
};

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AlreadySignedInResult: ResolverTypeWrapper<Omit<AlreadySignedInResult, 'signedInUser'> & { signedInUser: ResolversTypes['SignedInUser'] }>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  AuthProviderUser: ResolverTypeWrapper<AuthProviderUser>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Changeset: ResolverTypeWrapper<Scalars['Changeset']['output']>;
  CollabText: ResolverTypeWrapper<CollabTextMapper>;
  CollabTextRecord: ResolverTypeWrapper<CollabTextRecordMapper>;
  CollabTextRecordConnection: ResolverTypeWrapper<CollabTextRecordConnectionMapper>;
  CollabTextRecordEdge: ResolverTypeWrapper<CollabTextRecordEdgeMapper>;
  CollabTextRecordInput: CollabTextRecordInput;
  CollabTextSelectionRange: ResolverTypeWrapper<CollabTextSelectionRangeMapper>;
  CollabTextSelectionRangeInput: CollabTextSelectionRangeInput;
  Connection: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Connection']>;
  CreateCollabTextInput: CreateCollabTextInput;
  CreateNoteCollabInput: CreateNoteCollabInput;
  CreateNoteInput: CreateNoteInput;
  CreateNoteLinkByShareAccessInput: CreateNoteLinkByShareAccessInput;
  CreateNoteLinkByShareAccessPayload: ResolverTypeWrapper<Omit<CreateNoteLinkByShareAccessPayload, 'userNoteLink'> & { userNoteLink: ResolversTypes['UserNoteLink'] }>;
  CreateNotePayload: ResolverTypeWrapper<Omit<CreateNotePayload, 'note' | 'userNoteLink'> & { note: ResolversTypes['Note'], userNoteLink: ResolversTypes['UserNoteLink'] }>;
  CreateNoteTextFieldEntryInput: CreateNoteTextFieldEntryInput;
  CreateUserNoteLinkInput: CreateUserNoteLinkInput;
  Cursor: ResolverTypeWrapper<Scalars['Cursor']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DeleteNoteInput: DeleteNoteInput;
  DeleteNotePayload: ResolverTypeWrapper<DeleteNotePayload>;
  DeleteNoteSharePayload: ResolverTypeWrapper<Omit<DeleteNoteSharePayload, 'note'> & { note: ResolversTypes['Note'] }>;
  DeleteShareNoteInput: DeleteShareNoteInput;
  Edge: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Edge']>;
  GoogleJWTAuthInput: GoogleJWTAuthInput;
  HexColorCode: ResolverTypeWrapper<Scalars['HexColorCode']['output']>;
  JustSignedInResult: ResolverTypeWrapper<Omit<JustSignedInResult, 'signedInUser'> & { signedInUser: ResolversTypes['SignedInUser'] }>;
  ListAnchorPosition: ListAnchorPosition;
  MovableNoteCategory: MovableNoteCategory;
  MoveUserNoteLinkInput: MoveUserNoteLinkInput;
  MoveUserNoteLinkPayload: ResolverTypeWrapper<Omit<MoveUserNoteLinkPayload, 'location' | 'userNoteLink'> & { location: ResolversTypes['NoteLocation'], userNoteLink: ResolversTypes['UserNoteLink'] }>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  NonNegativeInt: ResolverTypeWrapper<Scalars['NonNegativeInt']['output']>;
  Note: ResolverTypeWrapper<NoteMapper>;
  NoteCategory: NoteCategory;
  NoteCollab: ResolverTypeWrapper<NoteCollabMapper>;
  NoteEditorEventsPayload: ResolverTypeWrapper<Omit<NoteEditorEventsPayload, 'mutations'> & { mutations: Array<ResolversTypes['NoteEditorMutations']> }>;
  NoteEditorMutations: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['NoteEditorMutations']>;
  NoteEditorUserSubscribedEvent: ResolverTypeWrapper<Omit<NoteEditorUserSubscribedEvent, 'note' | 'user'> & { note: ResolversTypes['Note'], user: ResolversTypes['PublicUser'] }>;
  NoteEditorUserUnsubscribedEvent: ResolverTypeWrapper<Omit<NoteEditorUserUnsubscribedEvent, 'note' | 'user'> & { note: ResolversTypes['Note'], user: ResolversTypes['PublicUser'] }>;
  NoteLocation: ResolverTypeWrapper<Omit<NoteLocation, 'anchorUserNoteLink'> & { anchorUserNoteLink?: Maybe<ResolversTypes['UserNoteLink']> }>;
  NoteLocationInput: NoteLocationInput;
  NotePreferences: ResolverTypeWrapper<NotePreferencesMapper>;
  NotePreferencesInput: NotePreferencesInput;
  NoteShareAccess: ResolverTypeWrapper<NoteShareAccess>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  NoteTextField: NoteTextField;
  NoteTextFieldEntry: ResolverTypeWrapper<NoteTextFieldEntryMapper>;
  ObjectID: ResolverTypeWrapper<Scalars['ObjectID']['output']>;
  PageInfo: ResolverTypeWrapper<PageInfoMapper>;
  PositiveInt: ResolverTypeWrapper<Scalars['PositiveInt']['output']>;
  PublicUser: ResolverTypeWrapper<PublicUserMapper>;
  PublicUserNoteLink: ResolverTypeWrapper<PublicUserNoteLinkMapper>;
  PublicUserProfile: ResolverTypeWrapper<PublicUserProfileMapper>;
  Query: ResolverTypeWrapper<{}>;
  RevisionChangeset: ResolverTypeWrapper<RevisionChangesetMapper>;
  RevisionChangesetInput: RevisionChangesetInput;
  Role: Role;
  ShareNoteInput: ShareNoteInput;
  ShareNotePayload: ResolverTypeWrapper<Omit<ShareNotePayload, 'note'> & { note: ResolversTypes['Note'] }>;
  SignInInput: SignInInput;
  SignInPayload: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['SignInPayload']>;
  SignInResult: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['SignInResult']>;
  SignOutInput: SignOutInput;
  SignOutPayload: ResolverTypeWrapper<SignOutPayload>;
  SignedInUser: ResolverTypeWrapper<SignedInUserMapper>;
  SignedInUserEventsPayload: ResolverTypeWrapper<Omit<SignedInUserEventsPayload, 'mutations'> & { mutations?: Maybe<Array<ResolversTypes['SignedInUserMutations']>> }>;
  SignedInUserMutations: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['SignedInUserMutations']>;
  Subscription: ResolverTypeWrapper<{}>;
  SyncSessionCookiesInput: SyncSessionCookiesInput;
  SyncSessionCookiesPayload: ResolverTypeWrapper<SyncSessionCookiesPayload>;
  TrashUserNoteLinkInput: TrashUserNoteLinkInput;
  TrashUserNoteLinkPayload: ResolverTypeWrapper<Omit<TrashUserNoteLinkPayload, 'userNoteLink'> & { userNoteLink: ResolversTypes['UserNoteLink'] }>;
  UpdateNoteEditorSelectionRangeInput: UpdateNoteEditorSelectionRangeInput;
  UpdateNoteEditorSelectionRangePayload: ResolverTypeWrapper<Omit<UpdateNoteEditorSelectionRangePayload, 'collabText' | 'latestSelection' | 'note' | 'user'> & { collabText: ResolversTypes['CollabText'], latestSelection: ResolversTypes['CollabTextSelectionRange'], note: ResolversTypes['Note'], user: ResolversTypes['PublicUser'] }>;
  UpdateNoteTextFieldInsertRecordInput: UpdateNoteTextFieldInsertRecordInput;
  UpdateNoteTextFieldInsertRecordPayload: ResolverTypeWrapper<Omit<UpdateNoteTextFieldInsertRecordPayload, 'collabText' | 'newRecord' | 'note'> & { collabText: ResolversTypes['CollabText'], newRecord: ResolversTypes['CollabTextRecord'], note: ResolversTypes['Note'] }>;
  UpdateSignedInUserDisplayNameInput: UpdateSignedInUserDisplayNameInput;
  UpdateSignedInUserDisplayNamePayload: ResolverTypeWrapper<Omit<UpdateSignedInUserDisplayNamePayload, 'signedInUser'> & { signedInUser: ResolversTypes['SignedInUser'] }>;
  UpdateUserNoteLinkBackgroundColorInput: UpdateUserNoteLinkBackgroundColorInput;
  UpdateUserNoteLinkBackgroundColorPayload: ResolverTypeWrapper<Omit<UpdateUserNoteLinkBackgroundColorPayload, 'userNoteLink'> & { userNoteLink: ResolversTypes['UserNoteLink'] }>;
  UpdateUserNoteLinkReadOnlyInput: UpdateUserNoteLinkReadOnlyInput;
  UpdateUserNoteLinkReadOnlyPayload: ResolverTypeWrapper<Omit<UpdateUserNoteLinkReadOnlyPayload, 'note' | 'publicUserNoteLink' | 'user'> & { note: ResolversTypes['Note'], publicUserNoteLink: ResolversTypes['PublicUserNoteLink'], user: ResolversTypes['PublicUser'] }>;
  UserNoteLink: ResolverTypeWrapper<UserNoteLinkMapper>;
  UserNoteLinkConnection: ResolverTypeWrapper<UserNoteLinkConnectionMapper>;
  UserNoteLinkEdge: ResolverTypeWrapper<UserNoteLinkEdgeMapper>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AlreadySignedInResult: Omit<AlreadySignedInResult, 'signedInUser'> & { signedInUser: ResolversParentTypes['SignedInUser'] };
  String: Scalars['String']['output'];
  AuthProviderUser: AuthProviderUser;
  ID: Scalars['ID']['output'];
  Changeset: Scalars['Changeset']['output'];
  CollabText: CollabTextMapper;
  CollabTextRecord: CollabTextRecordMapper;
  CollabTextRecordConnection: CollabTextRecordConnectionMapper;
  CollabTextRecordEdge: CollabTextRecordEdgeMapper;
  CollabTextRecordInput: CollabTextRecordInput;
  CollabTextSelectionRange: CollabTextSelectionRangeMapper;
  CollabTextSelectionRangeInput: CollabTextSelectionRangeInput;
  Connection: ResolversInterfaceTypes<ResolversParentTypes>['Connection'];
  CreateCollabTextInput: CreateCollabTextInput;
  CreateNoteCollabInput: CreateNoteCollabInput;
  CreateNoteInput: CreateNoteInput;
  CreateNoteLinkByShareAccessInput: CreateNoteLinkByShareAccessInput;
  CreateNoteLinkByShareAccessPayload: Omit<CreateNoteLinkByShareAccessPayload, 'userNoteLink'> & { userNoteLink: ResolversParentTypes['UserNoteLink'] };
  CreateNotePayload: Omit<CreateNotePayload, 'note' | 'userNoteLink'> & { note: ResolversParentTypes['Note'], userNoteLink: ResolversParentTypes['UserNoteLink'] };
  CreateNoteTextFieldEntryInput: CreateNoteTextFieldEntryInput;
  CreateUserNoteLinkInput: CreateUserNoteLinkInput;
  Cursor: Scalars['Cursor']['output'];
  DateTime: Scalars['DateTime']['output'];
  DeleteNoteInput: DeleteNoteInput;
  DeleteNotePayload: DeleteNotePayload;
  DeleteNoteSharePayload: Omit<DeleteNoteSharePayload, 'note'> & { note: ResolversParentTypes['Note'] };
  DeleteShareNoteInput: DeleteShareNoteInput;
  Edge: ResolversInterfaceTypes<ResolversParentTypes>['Edge'];
  GoogleJWTAuthInput: GoogleJWTAuthInput;
  HexColorCode: Scalars['HexColorCode']['output'];
  JustSignedInResult: Omit<JustSignedInResult, 'signedInUser'> & { signedInUser: ResolversParentTypes['SignedInUser'] };
  MoveUserNoteLinkInput: MoveUserNoteLinkInput;
  MoveUserNoteLinkPayload: Omit<MoveUserNoteLinkPayload, 'location' | 'userNoteLink'> & { location: ResolversParentTypes['NoteLocation'], userNoteLink: ResolversParentTypes['UserNoteLink'] };
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  NonNegativeInt: Scalars['NonNegativeInt']['output'];
  Note: NoteMapper;
  NoteCollab: NoteCollabMapper;
  NoteEditorEventsPayload: Omit<NoteEditorEventsPayload, 'mutations'> & { mutations: Array<ResolversParentTypes['NoteEditorMutations']> };
  NoteEditorMutations: ResolversUnionTypes<ResolversParentTypes>['NoteEditorMutations'];
  NoteEditorUserSubscribedEvent: Omit<NoteEditorUserSubscribedEvent, 'note' | 'user'> & { note: ResolversParentTypes['Note'], user: ResolversParentTypes['PublicUser'] };
  NoteEditorUserUnsubscribedEvent: Omit<NoteEditorUserUnsubscribedEvent, 'note' | 'user'> & { note: ResolversParentTypes['Note'], user: ResolversParentTypes['PublicUser'] };
  NoteLocation: Omit<NoteLocation, 'anchorUserNoteLink'> & { anchorUserNoteLink?: Maybe<ResolversParentTypes['UserNoteLink']> };
  NoteLocationInput: NoteLocationInput;
  NotePreferences: NotePreferencesMapper;
  NotePreferencesInput: NotePreferencesInput;
  NoteShareAccess: NoteShareAccess;
  Boolean: Scalars['Boolean']['output'];
  NoteTextFieldEntry: NoteTextFieldEntryMapper;
  ObjectID: Scalars['ObjectID']['output'];
  PageInfo: PageInfoMapper;
  PositiveInt: Scalars['PositiveInt']['output'];
  PublicUser: PublicUserMapper;
  PublicUserNoteLink: PublicUserNoteLinkMapper;
  PublicUserProfile: PublicUserProfileMapper;
  Query: {};
  RevisionChangeset: RevisionChangesetMapper;
  RevisionChangesetInput: RevisionChangesetInput;
  ShareNoteInput: ShareNoteInput;
  ShareNotePayload: Omit<ShareNotePayload, 'note'> & { note: ResolversParentTypes['Note'] };
  SignInInput: SignInInput;
  SignInPayload: ResolversUnionTypes<ResolversParentTypes>['SignInPayload'];
  SignInResult: ResolversInterfaceTypes<ResolversParentTypes>['SignInResult'];
  SignOutInput: SignOutInput;
  SignOutPayload: SignOutPayload;
  SignedInUser: SignedInUserMapper;
  SignedInUserEventsPayload: Omit<SignedInUserEventsPayload, 'mutations'> & { mutations?: Maybe<Array<ResolversParentTypes['SignedInUserMutations']>> };
  SignedInUserMutations: ResolversUnionTypes<ResolversParentTypes>['SignedInUserMutations'];
  Subscription: {};
  SyncSessionCookiesInput: SyncSessionCookiesInput;
  SyncSessionCookiesPayload: SyncSessionCookiesPayload;
  TrashUserNoteLinkInput: TrashUserNoteLinkInput;
  TrashUserNoteLinkPayload: Omit<TrashUserNoteLinkPayload, 'userNoteLink'> & { userNoteLink: ResolversParentTypes['UserNoteLink'] };
  UpdateNoteEditorSelectionRangeInput: UpdateNoteEditorSelectionRangeInput;
  UpdateNoteEditorSelectionRangePayload: Omit<UpdateNoteEditorSelectionRangePayload, 'collabText' | 'latestSelection' | 'note' | 'user'> & { collabText: ResolversParentTypes['CollabText'], latestSelection: ResolversParentTypes['CollabTextSelectionRange'], note: ResolversParentTypes['Note'], user: ResolversParentTypes['PublicUser'] };
  UpdateNoteTextFieldInsertRecordInput: UpdateNoteTextFieldInsertRecordInput;
  UpdateNoteTextFieldInsertRecordPayload: Omit<UpdateNoteTextFieldInsertRecordPayload, 'collabText' | 'newRecord' | 'note'> & { collabText: ResolversParentTypes['CollabText'], newRecord: ResolversParentTypes['CollabTextRecord'], note: ResolversParentTypes['Note'] };
  UpdateSignedInUserDisplayNameInput: UpdateSignedInUserDisplayNameInput;
  UpdateSignedInUserDisplayNamePayload: Omit<UpdateSignedInUserDisplayNamePayload, 'signedInUser'> & { signedInUser: ResolversParentTypes['SignedInUser'] };
  UpdateUserNoteLinkBackgroundColorInput: UpdateUserNoteLinkBackgroundColorInput;
  UpdateUserNoteLinkBackgroundColorPayload: Omit<UpdateUserNoteLinkBackgroundColorPayload, 'userNoteLink'> & { userNoteLink: ResolversParentTypes['UserNoteLink'] };
  UpdateUserNoteLinkReadOnlyInput: UpdateUserNoteLinkReadOnlyInput;
  UpdateUserNoteLinkReadOnlyPayload: Omit<UpdateUserNoteLinkReadOnlyPayload, 'note' | 'publicUserNoteLink' | 'user'> & { note: ResolversParentTypes['Note'], publicUserNoteLink: ResolversParentTypes['PublicUserNoteLink'], user: ResolversParentTypes['PublicUser'] };
  UserNoteLink: UserNoteLinkMapper;
  UserNoteLinkConnection: UserNoteLinkConnectionMapper;
  UserNoteLinkEdge: UserNoteLinkEdgeMapper;
};

export type authDirectiveArgs = {
  requires?: Maybe<Role>;
};

export type authDirectiveResolver<Result, Parent, ContextType = GraphQLResolversContext, Args = authDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type lengthDirectiveArgs = {
  max?: Maybe<Scalars['NonNegativeInt']['input']>;
};

export type lengthDirectiveResolver<Result, Parent, ContextType = GraphQLResolversContext, Args = lengthDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type AlreadySignedInResultResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['AlreadySignedInResult'] = ResolversParentTypes['AlreadySignedInResult']> = {
  availableUserIds?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  signedInUser?: Resolver<ResolversTypes['SignedInUser'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AuthProviderUserResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['AuthProviderUser'] = ResolversParentTypes['AuthProviderUser']> = {
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ChangesetScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Changeset'], any> {
  name: 'Changeset';
}

export type CollabTextResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['CollabText'] = ResolversParentTypes['CollabText']> = {
  headText?: Resolver<ResolversTypes['RevisionChangeset'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  recordConnection?: Resolver<ResolversTypes['CollabTextRecordConnection'], ParentType, ContextType, Partial<CollabTextrecordConnectionArgs>>;
  tailText?: Resolver<ResolversTypes['RevisionChangeset'], ParentType, ContextType>;
  textAtRevision?: Resolver<ResolversTypes['RevisionChangeset'], ParentType, ContextType, RequireFields<CollabTexttextAtRevisionArgs, 'revision'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CollabTextRecordResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['CollabTextRecord'] = ResolversParentTypes['CollabTextRecord']> = {
  afterSelection?: Resolver<ResolversTypes['CollabTextSelectionRange'], ParentType, ContextType>;
  beforeSelection?: Resolver<ResolversTypes['CollabTextSelectionRange'], ParentType, ContextType>;
  change?: Resolver<ResolversTypes['RevisionChangeset'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  creatorUser?: Resolver<ResolversTypes['PublicUser'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CollabTextRecordConnectionResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['CollabTextRecordConnection'] = ResolversParentTypes['CollabTextRecordConnection']> = {
  edges?: Resolver<Array<ResolversTypes['CollabTextRecordEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  records?: Resolver<Array<ResolversTypes['CollabTextRecord']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CollabTextRecordEdgeResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['CollabTextRecordEdge'] = ResolversParentTypes['CollabTextRecordEdge']> = {
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CollabTextRecord'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CollabTextSelectionRangeResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['CollabTextSelectionRange'] = ResolversParentTypes['CollabTextSelectionRange']> = {
  end?: Resolver<Maybe<ResolversTypes['NonNegativeInt']>, ParentType, ContextType>;
  start?: Resolver<ResolversTypes['NonNegativeInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ConnectionResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Connection'] = ResolversParentTypes['Connection']> = {
  __resolveType?: TypeResolveFn<'CollabTextRecordConnection' | 'UserNoteLinkConnection', ParentType, ContextType>;
  edges?: Resolver<Array<Maybe<ResolversTypes['Edge']>>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
};

export type CreateNoteLinkByShareAccessPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['CreateNoteLinkByShareAccessPayload'] = ResolversParentTypes['CreateNoteLinkByShareAccessPayload']> = {
  userNoteLink?: Resolver<ResolversTypes['UserNoteLink'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateNotePayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['CreateNotePayload'] = ResolversParentTypes['CreateNotePayload']> = {
  note?: Resolver<ResolversTypes['Note'], ParentType, ContextType>;
  userNoteLink?: Resolver<ResolversTypes['UserNoteLink'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface CursorScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Cursor'], any> {
  name: 'Cursor';
}

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DeleteNotePayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['DeleteNotePayload'] = ResolversParentTypes['DeleteNotePayload']> = {
  noteId?: Resolver<Maybe<ResolversTypes['ObjectID']>, ParentType, ContextType>;
  publicUserNoteLinkId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userNoteLinkId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DeleteNoteSharePayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['DeleteNoteSharePayload'] = ResolversParentTypes['DeleteNoteSharePayload']> = {
  note?: Resolver<ResolversTypes['Note'], ParentType, ContextType>;
  shareAccessId?: Resolver<ResolversTypes['ObjectID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type EdgeResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Edge'] = ResolversParentTypes['Edge']> = {
  __resolveType?: TypeResolveFn<'CollabTextRecordEdge' | 'UserNoteLinkEdge', ParentType, ContextType>;
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Node'], ParentType, ContextType>;
};

export interface HexColorCodeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['HexColorCode'], any> {
  name: 'HexColorCode';
}

export type JustSignedInResultResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['JustSignedInResult'] = ResolversParentTypes['JustSignedInResult']> = {
  authProviderUser?: Resolver<ResolversTypes['AuthProviderUser'], ParentType, ContextType>;
  availableUserIds?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  signedInUser?: Resolver<ResolversTypes['SignedInUser'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MoveUserNoteLinkPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['MoveUserNoteLinkPayload'] = ResolversParentTypes['MoveUserNoteLinkPayload']> = {
  location?: Resolver<ResolversTypes['NoteLocation'], ParentType, ContextType>;
  userNoteLink?: Resolver<ResolversTypes['UserNoteLink'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createNote?: Resolver<Maybe<ResolversTypes['CreateNotePayload']>, ParentType, ContextType, RequireFields<MutationcreateNoteArgs, 'input'>>;
  createNoteLinkByShareAccess?: Resolver<ResolversTypes['CreateNoteLinkByShareAccessPayload'], ParentType, ContextType, RequireFields<MutationcreateNoteLinkByShareAccessArgs, 'input'>>;
  deleteNote?: Resolver<ResolversTypes['DeleteNotePayload'], ParentType, ContextType, RequireFields<MutationdeleteNoteArgs, 'input'>>;
  deleteShareNote?: Resolver<ResolversTypes['DeleteNoteSharePayload'], ParentType, ContextType, RequireFields<MutationdeleteShareNoteArgs, 'input'>>;
  moveUserNoteLink?: Resolver<ResolversTypes['MoveUserNoteLinkPayload'], ParentType, ContextType, RequireFields<MutationmoveUserNoteLinkArgs, 'input'>>;
  shareNote?: Resolver<ResolversTypes['ShareNotePayload'], ParentType, ContextType, RequireFields<MutationshareNoteArgs, 'input'>>;
  signIn?: Resolver<ResolversTypes['SignInPayload'], ParentType, ContextType, RequireFields<MutationsignInArgs, 'input'>>;
  signOut?: Resolver<ResolversTypes['SignOutPayload'], ParentType, ContextType, Partial<MutationsignOutArgs>>;
  syncSessionCookies?: Resolver<ResolversTypes['SyncSessionCookiesPayload'], ParentType, ContextType, RequireFields<MutationsyncSessionCookiesArgs, 'input'>>;
  trashUserNoteLink?: Resolver<ResolversTypes['TrashUserNoteLinkPayload'], ParentType, ContextType, RequireFields<MutationtrashUserNoteLinkArgs, 'input'>>;
  updateNoteEditorSelectionRange?: Resolver<ResolversTypes['UpdateNoteEditorSelectionRangePayload'], ParentType, ContextType, Partial<MutationupdateNoteEditorSelectionRangeArgs>>;
  updateNoteTextFieldInsertRecord?: Resolver<ResolversTypes['UpdateNoteTextFieldInsertRecordPayload'], ParentType, ContextType, RequireFields<MutationupdateNoteTextFieldInsertRecordArgs, 'input'>>;
  updateSignedInUserDisplayName?: Resolver<ResolversTypes['UpdateSignedInUserDisplayNamePayload'], ParentType, ContextType, RequireFields<MutationupdateSignedInUserDisplayNameArgs, 'input'>>;
  updateUserNoteLinkBackgroundColor?: Resolver<ResolversTypes['UpdateUserNoteLinkBackgroundColorPayload'], ParentType, ContextType, RequireFields<MutationupdateUserNoteLinkBackgroundColorArgs, 'input'>>;
  updateUserNoteLinkReadOnly?: Resolver<ResolversTypes['UpdateUserNoteLinkReadOnlyPayload'], ParentType, ContextType, RequireFields<MutationupdateUserNoteLinkReadOnlyArgs, 'input'>>;
};

export type NodeResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = {
  __resolveType?: TypeResolveFn<'CollabTextRecord' | 'UserNoteLink', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export interface NonNegativeIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['NonNegativeInt'], any> {
  name: 'NonNegativeInt';
}

export type NoteResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Note'] = ResolversParentTypes['Note']> = {
  collab?: Resolver<ResolversTypes['NoteCollab'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ObjectID'], ParentType, ContextType>;
  shareAccess?: Resolver<Maybe<ResolversTypes['NoteShareAccess']>, ParentType, ContextType>;
  users?: Resolver<Array<ResolversTypes['PublicUserNoteLink']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NoteCollabResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NoteCollab'] = ResolversParentTypes['NoteCollab']> = {
  textFields?: Resolver<Array<ResolversTypes['NoteTextFieldEntry']>, ParentType, ContextType, Partial<NoteCollabtextFieldsArgs>>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NoteEditorEventsPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NoteEditorEventsPayload'] = ResolversParentTypes['NoteEditorEventsPayload']> = {
  mutations?: Resolver<Array<ResolversTypes['NoteEditorMutations']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NoteEditorMutationsResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NoteEditorMutations'] = ResolversParentTypes['NoteEditorMutations']> = {
  __resolveType?: TypeResolveFn<'UpdateNoteEditorSelectionRangePayload', ParentType, ContextType>;
};

export type NoteEditorUserSubscribedEventResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NoteEditorUserSubscribedEvent'] = ResolversParentTypes['NoteEditorUserSubscribedEvent']> = {
  note?: Resolver<ResolversTypes['Note'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['PublicUser'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NoteEditorUserUnsubscribedEventResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NoteEditorUserUnsubscribedEvent'] = ResolversParentTypes['NoteEditorUserUnsubscribedEvent']> = {
  note?: Resolver<ResolversTypes['Note'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['PublicUser'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NoteLocationResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NoteLocation'] = ResolversParentTypes['NoteLocation']> = {
  anchorPosition?: Resolver<Maybe<ResolversTypes['ListAnchorPosition']>, ParentType, ContextType>;
  anchorUserNoteLink?: Resolver<Maybe<ResolversTypes['UserNoteLink']>, ParentType, ContextType>;
  categoryName?: Resolver<ResolversTypes['MovableNoteCategory'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NotePreferencesResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NotePreferences'] = ResolversParentTypes['NotePreferences']> = {
  backgroundColor?: Resolver<Maybe<ResolversTypes['HexColorCode']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NoteShareAccessResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NoteShareAccess'] = ResolversParentTypes['NoteShareAccess']> = {
  id?: Resolver<ResolversTypes['ObjectID'], ParentType, ContextType>;
  readOnly?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NoteTextFieldEntryResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NoteTextFieldEntry'] = ResolversParentTypes['NoteTextFieldEntry']> = {
  key?: Resolver<ResolversTypes['NoteTextField'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['CollabText'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ObjectIDScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ObjectID'], any> {
  name: 'ObjectID';
}

export type PageInfoResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = {
  endCursor?: Resolver<Maybe<ResolversTypes['Cursor']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['Cursor']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface PositiveIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['PositiveInt'], any> {
  name: 'PositiveInt';
}

export type PublicUserResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['PublicUser'] = ResolversParentTypes['PublicUser']> = {
  id?: Resolver<ResolversTypes['ObjectID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['PublicUserProfile'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PublicUserNoteLinkResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['PublicUserNoteLink'] = ResolversParentTypes['PublicUserNoteLink']> = {
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  editing?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  readOnly?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['PublicUser'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PublicUserProfileResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['PublicUserProfile'] = ResolversParentTypes['PublicUserProfile']> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  signedInUser?: Resolver<ResolversTypes['SignedInUser'], ParentType, ContextType>;
  userNoteLinkByNoteId?: Resolver<ResolversTypes['UserNoteLink'], ParentType, ContextType, RequireFields<QueryuserNoteLinkByNoteIdArgs, 'noteId'>>;
  userNoteLinkConnection?: Resolver<ResolversTypes['UserNoteLinkConnection'], ParentType, ContextType, Partial<QueryuserNoteLinkConnectionArgs>>;
  userNoteLinkSearchConnection?: Resolver<ResolversTypes['UserNoteLinkConnection'], ParentType, ContextType, RequireFields<QueryuserNoteLinkSearchConnectionArgs, 'searchText'>>;
};

export type RevisionChangesetResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['RevisionChangeset'] = ResolversParentTypes['RevisionChangeset']> = {
  changeset?: Resolver<ResolversTypes['Changeset'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['NonNegativeInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ShareNotePayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['ShareNotePayload'] = ResolversParentTypes['ShareNotePayload']> = {
  note?: Resolver<ResolversTypes['Note'], ParentType, ContextType>;
  shareAccess?: Resolver<ResolversTypes['NoteShareAccess'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SignInPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['SignInPayload'] = ResolversParentTypes['SignInPayload']> = {
  __resolveType?: TypeResolveFn<'AlreadySignedInResult' | 'JustSignedInResult', ParentType, ContextType>;
};

export type SignInResultResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['SignInResult'] = ResolversParentTypes['SignInResult']> = {
  __resolveType?: TypeResolveFn<'AlreadySignedInResult' | 'JustSignedInResult', ParentType, ContextType>;
  availableUserIds?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  signedInUser?: Resolver<ResolversTypes['SignedInUser'], ParentType, ContextType>;
};

export type SignOutPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['SignOutPayload'] = ResolversParentTypes['SignOutPayload']> = {
  availableUserIds?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  signedOutUserIds?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SignedInUserResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['SignedInUser'] = ResolversParentTypes['SignedInUser']> = {
  id?: Resolver<ResolversTypes['ObjectID'], ParentType, ContextType>;
  public?: Resolver<ResolversTypes['PublicUser'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SignedInUserEventsPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['SignedInUserEventsPayload'] = ResolversParentTypes['SignedInUserEventsPayload']> = {
  mutations?: Resolver<Maybe<Array<ResolversTypes['SignedInUserMutations']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SignedInUserMutationsResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['SignedInUserMutations'] = ResolversParentTypes['SignedInUserMutations']> = {
  __resolveType?: TypeResolveFn<'CreateNoteLinkByShareAccessPayload' | 'CreateNotePayload' | 'DeleteNotePayload' | 'DeleteNoteSharePayload' | 'MoveUserNoteLinkPayload' | 'NoteEditorUserSubscribedEvent' | 'NoteEditorUserUnsubscribedEvent' | 'ShareNotePayload' | 'TrashUserNoteLinkPayload' | 'UpdateNoteTextFieldInsertRecordPayload' | 'UpdateSignedInUserDisplayNamePayload' | 'UpdateUserNoteLinkBackgroundColorPayload' | 'UpdateUserNoteLinkReadOnlyPayload', ParentType, ContextType>;
};

export type SubscriptionResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = {
  noteEditorEvents?: SubscriptionResolver<ResolversTypes['NoteEditorEventsPayload'], "noteEditorEvents", ParentType, ContextType, RequireFields<SubscriptionnoteEditorEventsArgs, 'noteId'>>;
  signedInUserEvents?: SubscriptionResolver<ResolversTypes['SignedInUserEventsPayload'], "signedInUserEvents", ParentType, ContextType>;
};

export type SyncSessionCookiesPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['SyncSessionCookiesPayload'] = ResolversParentTypes['SyncSessionCookiesPayload']> = {
  availableUserIds?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TrashUserNoteLinkPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['TrashUserNoteLinkPayload'] = ResolversParentTypes['TrashUserNoteLinkPayload']> = {
  deletedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  userNoteLink?: Resolver<ResolversTypes['UserNoteLink'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UpdateNoteEditorSelectionRangePayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['UpdateNoteEditorSelectionRangePayload'] = ResolversParentTypes['UpdateNoteEditorSelectionRangePayload']> = {
  collabText?: Resolver<ResolversTypes['CollabText'], ParentType, ContextType>;
  latestSelection?: Resolver<ResolversTypes['CollabTextSelectionRange'], ParentType, ContextType>;
  note?: Resolver<ResolversTypes['Note'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['NonNegativeInt'], ParentType, ContextType>;
  textField?: Resolver<ResolversTypes['NoteTextField'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['PublicUser'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UpdateNoteTextFieldInsertRecordPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['UpdateNoteTextFieldInsertRecordPayload'] = ResolversParentTypes['UpdateNoteTextFieldInsertRecordPayload']> = {
  collabText?: Resolver<ResolversTypes['CollabText'], ParentType, ContextType>;
  isDuplicateRecord?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  newRecord?: Resolver<ResolversTypes['CollabTextRecord'], ParentType, ContextType>;
  note?: Resolver<ResolversTypes['Note'], ParentType, ContextType>;
  textField?: Resolver<ResolversTypes['NoteTextField'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UpdateSignedInUserDisplayNamePayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['UpdateSignedInUserDisplayNamePayload'] = ResolversParentTypes['UpdateSignedInUserDisplayNamePayload']> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  signedInUser?: Resolver<ResolversTypes['SignedInUser'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UpdateUserNoteLinkBackgroundColorPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['UpdateUserNoteLinkBackgroundColorPayload'] = ResolversParentTypes['UpdateUserNoteLinkBackgroundColorPayload']> = {
  backgroundColor?: Resolver<ResolversTypes['HexColorCode'], ParentType, ContextType>;
  userNoteLink?: Resolver<ResolversTypes['UserNoteLink'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UpdateUserNoteLinkReadOnlyPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['UpdateUserNoteLinkReadOnlyPayload'] = ResolversParentTypes['UpdateUserNoteLinkReadOnlyPayload']> = {
  note?: Resolver<ResolversTypes['Note'], ParentType, ContextType>;
  publicUserNoteLink?: Resolver<ResolversTypes['PublicUserNoteLink'], ParentType, ContextType>;
  readOnly?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['PublicUser'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserNoteLinkResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['UserNoteLink'] = ResolversParentTypes['UserNoteLink']> = {
  categoryName?: Resolver<ResolversTypes['NoteCategory'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  note?: Resolver<ResolversTypes['Note'], ParentType, ContextType>;
  preferences?: Resolver<Maybe<ResolversTypes['NotePreferences']>, ParentType, ContextType>;
  public?: Resolver<ResolversTypes['PublicUserNoteLink'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserNoteLinkConnectionResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['UserNoteLinkConnection'] = ResolversParentTypes['UserNoteLinkConnection']> = {
  edges?: Resolver<Array<ResolversTypes['UserNoteLinkEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  userNoteLinks?: Resolver<Array<ResolversTypes['UserNoteLink']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserNoteLinkEdgeResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['UserNoteLinkEdge'] = ResolversParentTypes['UserNoteLinkEdge']> = {
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['UserNoteLink'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLResolversContext> = {
  AlreadySignedInResult?: AlreadySignedInResultResolvers<ContextType>;
  AuthProviderUser?: AuthProviderUserResolvers<ContextType>;
  Changeset?: GraphQLScalarType;
  CollabText?: CollabTextResolvers<ContextType>;
  CollabTextRecord?: CollabTextRecordResolvers<ContextType>;
  CollabTextRecordConnection?: CollabTextRecordConnectionResolvers<ContextType>;
  CollabTextRecordEdge?: CollabTextRecordEdgeResolvers<ContextType>;
  CollabTextSelectionRange?: CollabTextSelectionRangeResolvers<ContextType>;
  Connection?: ConnectionResolvers<ContextType>;
  CreateNoteLinkByShareAccessPayload?: CreateNoteLinkByShareAccessPayloadResolvers<ContextType>;
  CreateNotePayload?: CreateNotePayloadResolvers<ContextType>;
  Cursor?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  DeleteNotePayload?: DeleteNotePayloadResolvers<ContextType>;
  DeleteNoteSharePayload?: DeleteNoteSharePayloadResolvers<ContextType>;
  Edge?: EdgeResolvers<ContextType>;
  HexColorCode?: GraphQLScalarType;
  JustSignedInResult?: JustSignedInResultResolvers<ContextType>;
  MoveUserNoteLinkPayload?: MoveUserNoteLinkPayloadResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  NonNegativeInt?: GraphQLScalarType;
  Note?: NoteResolvers<ContextType>;
  NoteCollab?: NoteCollabResolvers<ContextType>;
  NoteEditorEventsPayload?: NoteEditorEventsPayloadResolvers<ContextType>;
  NoteEditorMutations?: NoteEditorMutationsResolvers<ContextType>;
  NoteEditorUserSubscribedEvent?: NoteEditorUserSubscribedEventResolvers<ContextType>;
  NoteEditorUserUnsubscribedEvent?: NoteEditorUserUnsubscribedEventResolvers<ContextType>;
  NoteLocation?: NoteLocationResolvers<ContextType>;
  NotePreferences?: NotePreferencesResolvers<ContextType>;
  NoteShareAccess?: NoteShareAccessResolvers<ContextType>;
  NoteTextFieldEntry?: NoteTextFieldEntryResolvers<ContextType>;
  ObjectID?: GraphQLScalarType;
  PageInfo?: PageInfoResolvers<ContextType>;
  PositiveInt?: GraphQLScalarType;
  PublicUser?: PublicUserResolvers<ContextType>;
  PublicUserNoteLink?: PublicUserNoteLinkResolvers<ContextType>;
  PublicUserProfile?: PublicUserProfileResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RevisionChangeset?: RevisionChangesetResolvers<ContextType>;
  ShareNotePayload?: ShareNotePayloadResolvers<ContextType>;
  SignInPayload?: SignInPayloadResolvers<ContextType>;
  SignInResult?: SignInResultResolvers<ContextType>;
  SignOutPayload?: SignOutPayloadResolvers<ContextType>;
  SignedInUser?: SignedInUserResolvers<ContextType>;
  SignedInUserEventsPayload?: SignedInUserEventsPayloadResolvers<ContextType>;
  SignedInUserMutations?: SignedInUserMutationsResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  SyncSessionCookiesPayload?: SyncSessionCookiesPayloadResolvers<ContextType>;
  TrashUserNoteLinkPayload?: TrashUserNoteLinkPayloadResolvers<ContextType>;
  UpdateNoteEditorSelectionRangePayload?: UpdateNoteEditorSelectionRangePayloadResolvers<ContextType>;
  UpdateNoteTextFieldInsertRecordPayload?: UpdateNoteTextFieldInsertRecordPayloadResolvers<ContextType>;
  UpdateSignedInUserDisplayNamePayload?: UpdateSignedInUserDisplayNamePayloadResolvers<ContextType>;
  UpdateUserNoteLinkBackgroundColorPayload?: UpdateUserNoteLinkBackgroundColorPayloadResolvers<ContextType>;
  UpdateUserNoteLinkReadOnlyPayload?: UpdateUserNoteLinkReadOnlyPayloadResolvers<ContextType>;
  UserNoteLink?: UserNoteLinkResolvers<ContextType>;
  UserNoteLinkConnection?: UserNoteLinkConnectionResolvers<ContextType>;
  UserNoteLinkEdge?: UserNoteLinkEdgeResolvers<ContextType>;
};

export type DirectiveResolvers<ContextType = GraphQLResolversContext> = {
  auth?: authDirectiveResolver<any, any, ContextType>;
  length?: lengthDirectiveResolver<any, any, ContextType>;
};
