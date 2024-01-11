import { GraphQLResolveInfo, SelectionSetNode, FieldNode, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GraphQLResolversContext } from './context';
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string | number; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Date: { input: Date | string; output: Date | string; }
  HexColorCode: { input: string; output: string; }
  /** int >= 0 */
  NonNegativeInt: { input: number; output: number; }
  /** int > 0 */
  PositiveInt: { input: number; output: number; }
};

export type AuthProvider =
  | 'GOOGLE';

export type Connection = {
  /** Self descriptive */
  edges: Array<Edge>;
  /** Self descriptive */
  pageInfo: PageInfo;
};

export type CreateNoteInput = {
  note?: InputMaybe<NotePatchInput>;
};

export type CreateNotePayload = {
  __typename?: 'CreateNotePayload';
  /** Created note */
  note: Note;
};

export type CredentialsInput = {
  token?: InputMaybe<Scalars['String']['input']>;
};

export type DeleteNoteInput = {
  id: Scalars['ID']['input'];
};

export type DeleteNotePayload = {
  __typename?: 'DeleteNotePayload';
  /** Was note deleted */
  deleted: Scalars['Boolean']['output'];
};

export type Edge = {
  /** Self descriptive */
  cursor: Scalars['String']['output'];
  /** Self descriptive */
  node: Node;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Create a new note */
  createNote?: Maybe<CreateNotePayload>;
  /** Delete note */
  deleteNote: DeleteNotePayload;
  /** On successful sign in, session ID is stored in a http-only cookie. Returns null on failed sign in. */
  signIn?: Maybe<SignInPayload>;
  /** Returns signed out http-conly cookie session index or null if user was not signed in. */
  signOut: SignOutPayload;
  /** Switch session to new index which is tied to http-only session cookie. Returns switched to session index. */
  switchToSession: SwitchToSessionPayload;
  /** Update note */
  updateNote: UpdateNotePayload;
};


export type MutationcreateNoteArgs = {
  input: CreateNoteInput;
};


export type MutationdeleteNoteArgs = {
  input: DeleteNoteInput;
};


export type MutationsignInArgs = {
  input: SignInInput;
};


export type MutationswitchToSessionArgs = {
  input: SwitchToSessionInput;
};


export type MutationupdateNoteArgs = {
  input: UpdateNoteInput;
};

export type Node = {
  /** Self descriptive */
  id: Scalars['ID']['output'];
};

export type Note = Node & {
  __typename?: 'Note';
  /** Self-descriptive */
  id: Scalars['ID']['output'];
  /** Note preferences such as note color */
  preferences: NotePreferences;
  /** Is note locked in a read-only state. null => readOnly: false */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  /** Note plain text content */
  textContent: Scalars['String']['output'];
  /** Note title to summarize note contents */
  title: Scalars['String']['output'];
};

export type NoteConnection = Connection & {
  __typename?: 'NoteConnection';
  /** Self descriptive */
  edges: Array<NoteEdge>;
  /** Query notes directly without edges */
  notes: Array<Note>;
  /** Self descriptive */
  pageInfo: PageInfo;
};

export type NoteCreatedPayload = {
  __typename?: 'NoteCreatedPayload';
  /** Created note info */
  note: Note;
};

export type NoteDeletedPayload = {
  __typename?: 'NoteDeletedPayload';
  /** ID of deleted note */
  id: Scalars['ID']['output'];
};

export type NoteEdge = Edge & {
  __typename?: 'NoteEdge';
  /** Self descriptive */
  cursor: Scalars['String']['output'];
  /** Self descriptive */
  node: Note;
};

export type NotePatch = {
  __typename?: 'NotePatch';
  /** Changed preferences */
  preferences?: Maybe<NotePreferencesPatch>;
  /** Changed note text content */
  textContent?: Maybe<Scalars['String']['output']>;
  /** Changed note title */
  title?: Maybe<Scalars['String']['output']>;
};

export type NotePatchInput = {
  preferences?: InputMaybe<NotePreferencesPatchInput>;
  textContent?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type NotePreferences = {
  __typename?: 'NotePreferences';
  /** Note background color */
  backgroundColor?: Maybe<Scalars['HexColorCode']['output']>;
};

export type NotePreferencesPatch = {
  __typename?: 'NotePreferencesPatch';
  /** Changed note background color */
  backgroundColor?: Maybe<Scalars['HexColorCode']['output']>;
};

export type NotePreferencesPatchInput = {
  backgroundColor?: InputMaybe<Scalars['HexColorCode']['input']>;
};

export type NoteUpdatedPayload = {
  __typename?: 'NoteUpdatedPayload';
  /** ID of note that was updated */
  id: Scalars['ID']['output'];
  /** Changes made to the note */
  patch: NotePatch;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  /** Self descriptive */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Self descriptive */
  hasNextPage: Scalars['Boolean']['output'];
};

export type Profile = {
  __typename?: 'Profile';
  /** User-friendly way to distinguish this user. Can be anything set by the user. */
  displayName: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Currently active session index saved in http-only cookie */
  activeSessionIndex: Scalars['NonNegativeInt']['output'];
  /** Currently active user info */
  currentUserInfo: UserInfo;
  /** Get note by ID */
  note: Note;
  /** Paginate notes */
  notesConnection: NoteConnection;
  /** Count of sessions saved in http-only cookie */
  sessionCount: Scalars['PositiveInt']['output'];
};


export type QuerynoteArgs = {
  id: Scalars['ID']['input'];
};


export type QuerynotesConnectionArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['NonNegativeInt']['input'];
};

export type Role =
  | 'USER';

export type SignInInput = {
  credentials: CredentialsInput;
  provider: AuthProvider;
};

export type SignInPayload = {
  __typename?: 'SignInPayload';
  /** Index of saved session in http-only cookie */
  sessionIndex: Scalars['NonNegativeInt']['output'];
  /** Signed in user info */
  userInfo: UserInfo;
};

export type SignOutPayload = {
  __typename?: 'SignOutPayload';
  /** Session index after signing out of current account, if any sessions still exist. */
  activeSessionIndex?: Maybe<Scalars['NonNegativeInt']['output']>;
  /** Was user just signed out */
  signedOut: Scalars['Boolean']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** A new note was created */
  noteCreated: NoteCreatedPayload;
  /** A note was deleted */
  noteDeleted: NoteDeletedPayload;
  /** An existing note was updated */
  noteUpdated: NoteUpdatedPayload;
};

export type SwitchToSessionInput = {
  switchToSessionIndex: Scalars['NonNegativeInt']['input'];
};

export type SwitchToSessionPayload = {
  __typename?: 'SwitchToSessionPayload';
  /** Active session index in http-only cookie */
  activeSessionIndex: Scalars['NonNegativeInt']['output'];
};

export type UpdateNoteInput = {
  id: Scalars['ID']['input'];
  patch?: InputMaybe<NotePatchInput>;
};

export type UpdateNotePayload = {
  __typename?: 'UpdateNotePayload';
  /** Updated note */
  note: Note;
};

/** User information accessible by a query */
export type UserInfo = {
  __typename?: 'UserInfo';
  /** Self-descriptive */
  profile: Profile;
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


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

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

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


/** Mapping of interface types */
export type ResolversInterfaceTypes<RefType extends Record<string, unknown>> = {
  Connection: ( NoteConnection & { __typename: 'NoteConnection' } );
  Edge: ( NoteEdge & { __typename: 'NoteEdge' } );
  Node: ( Note & { __typename: 'Note' } );
};

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AuthProvider: AuthProvider;
  Connection: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Connection']>;
  CreateNoteInput: CreateNoteInput;
  CreateNotePayload: ResolverTypeWrapper<CreateNotePayload>;
  CredentialsInput: CredentialsInput;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DeleteNoteInput: DeleteNoteInput;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  DeleteNotePayload: ResolverTypeWrapper<DeleteNotePayload>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Edge: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Edge']>;
  HexColorCode: ResolverTypeWrapper<Scalars['HexColorCode']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  NonNegativeInt: ResolverTypeWrapper<Scalars['NonNegativeInt']['output']>;
  Note: ResolverTypeWrapper<Note>;
  NoteConnection: ResolverTypeWrapper<NoteConnection>;
  NoteCreatedPayload: ResolverTypeWrapper<NoteCreatedPayload>;
  NoteDeletedPayload: ResolverTypeWrapper<NoteDeletedPayload>;
  NoteEdge: ResolverTypeWrapper<NoteEdge>;
  NotePatch: ResolverTypeWrapper<NotePatch>;
  NotePatchInput: NotePatchInput;
  NotePreferences: ResolverTypeWrapper<NotePreferences>;
  NotePreferencesPatch: ResolverTypeWrapper<NotePreferencesPatch>;
  NotePreferencesPatchInput: NotePreferencesPatchInput;
  NoteUpdatedPayload: ResolverTypeWrapper<NoteUpdatedPayload>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PositiveInt: ResolverTypeWrapper<Scalars['PositiveInt']['output']>;
  Profile: ResolverTypeWrapper<Profile>;
  Query: ResolverTypeWrapper<{}>;
  Role: Role;
  SignInInput: SignInInput;
  SignInPayload: ResolverTypeWrapper<SignInPayload>;
  SignOutPayload: ResolverTypeWrapper<SignOutPayload>;
  Subscription: ResolverTypeWrapper<{}>;
  SwitchToSessionInput: SwitchToSessionInput;
  SwitchToSessionPayload: ResolverTypeWrapper<SwitchToSessionPayload>;
  UpdateNoteInput: UpdateNoteInput;
  UpdateNotePayload: ResolverTypeWrapper<UpdateNotePayload>;
  UserInfo: ResolverTypeWrapper<UserInfo>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Connection: ResolversInterfaceTypes<ResolversParentTypes>['Connection'];
  CreateNoteInput: CreateNoteInput;
  CreateNotePayload: CreateNotePayload;
  CredentialsInput: CredentialsInput;
  String: Scalars['String']['output'];
  Date: Scalars['Date']['output'];
  DeleteNoteInput: DeleteNoteInput;
  ID: Scalars['ID']['output'];
  DeleteNotePayload: DeleteNotePayload;
  Boolean: Scalars['Boolean']['output'];
  Edge: ResolversInterfaceTypes<ResolversParentTypes>['Edge'];
  HexColorCode: Scalars['HexColorCode']['output'];
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  NonNegativeInt: Scalars['NonNegativeInt']['output'];
  Note: Note;
  NoteConnection: NoteConnection;
  NoteCreatedPayload: NoteCreatedPayload;
  NoteDeletedPayload: NoteDeletedPayload;
  NoteEdge: NoteEdge;
  NotePatch: NotePatch;
  NotePatchInput: NotePatchInput;
  NotePreferences: NotePreferences;
  NotePreferencesPatch: NotePreferencesPatch;
  NotePreferencesPatchInput: NotePreferencesPatchInput;
  NoteUpdatedPayload: NoteUpdatedPayload;
  PageInfo: PageInfo;
  PositiveInt: Scalars['PositiveInt']['output'];
  Profile: Profile;
  Query: {};
  SignInInput: SignInInput;
  SignInPayload: SignInPayload;
  SignOutPayload: SignOutPayload;
  Subscription: {};
  SwitchToSessionInput: SwitchToSessionInput;
  SwitchToSessionPayload: SwitchToSessionPayload;
  UpdateNoteInput: UpdateNoteInput;
  UpdateNotePayload: UpdateNotePayload;
  UserInfo: UserInfo;
};

export type authDirectiveArgs = {
  requires?: Maybe<Role>;
};

export type authDirectiveResolver<Result, Parent, ContextType = GraphQLResolversContext, Args = authDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ConnectionResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Connection'] = ResolversParentTypes['Connection']> = {
  __resolveType?: TypeResolveFn<'NoteConnection', ParentType, ContextType>;
  edges?: Resolver<Array<ResolversTypes['Edge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
};

export type CreateNotePayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['CreateNotePayload'] = ResolversParentTypes['CreateNotePayload']> = {
  note?: Resolver<ResolversTypes['Note'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export type DeleteNotePayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['DeleteNotePayload'] = ResolversParentTypes['DeleteNotePayload']> = {
  deleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type EdgeResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Edge'] = ResolversParentTypes['Edge']> = {
  __resolveType?: TypeResolveFn<'NoteEdge', ParentType, ContextType>;
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Node'], ParentType, ContextType>;
};

export interface HexColorCodeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['HexColorCode'], any> {
  name: 'HexColorCode';
}

export type MutationResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createNote?: Resolver<Maybe<ResolversTypes['CreateNotePayload']>, ParentType, ContextType, RequireFields<MutationcreateNoteArgs, 'input'>>;
  deleteNote?: Resolver<ResolversTypes['DeleteNotePayload'], ParentType, ContextType, RequireFields<MutationdeleteNoteArgs, 'input'>>;
  signIn?: Resolver<Maybe<ResolversTypes['SignInPayload']>, ParentType, ContextType, RequireFields<MutationsignInArgs, 'input'>>;
  signOut?: Resolver<ResolversTypes['SignOutPayload'], ParentType, ContextType>;
  switchToSession?: Resolver<ResolversTypes['SwitchToSessionPayload'], ParentType, ContextType, RequireFields<MutationswitchToSessionArgs, 'input'>>;
  updateNote?: Resolver<ResolversTypes['UpdateNotePayload'], ParentType, ContextType, RequireFields<MutationupdateNoteArgs, 'input'>>;
};

export type NodeResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = {
  __resolveType?: TypeResolveFn<'Note', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export interface NonNegativeIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['NonNegativeInt'], any> {
  name: 'NonNegativeInt';
}

export type NoteResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Note'] = ResolversParentTypes['Note']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  preferences?: Resolver<ResolversTypes['NotePreferences'], ParentType, ContextType>;
  readOnly?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  textContent?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NoteConnectionResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NoteConnection'] = ResolversParentTypes['NoteConnection']> = {
  edges?: Resolver<Array<ResolversTypes['NoteEdge']>, ParentType, ContextType>;
  notes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NoteCreatedPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NoteCreatedPayload'] = ResolversParentTypes['NoteCreatedPayload']> = {
  note?: Resolver<ResolversTypes['Note'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NoteDeletedPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NoteDeletedPayload'] = ResolversParentTypes['NoteDeletedPayload']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NoteEdgeResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NoteEdge'] = ResolversParentTypes['NoteEdge']> = {
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Note'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NotePatchResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NotePatch'] = ResolversParentTypes['NotePatch']> = {
  preferences?: Resolver<Maybe<ResolversTypes['NotePreferencesPatch']>, ParentType, ContextType>;
  textContent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NotePreferencesResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NotePreferences'] = ResolversParentTypes['NotePreferences']> = {
  backgroundColor?: Resolver<Maybe<ResolversTypes['HexColorCode']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NotePreferencesPatchResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NotePreferencesPatch'] = ResolversParentTypes['NotePreferencesPatch']> = {
  backgroundColor?: Resolver<Maybe<ResolversTypes['HexColorCode']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NoteUpdatedPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['NoteUpdatedPayload'] = ResolversParentTypes['NoteUpdatedPayload']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  patch?: Resolver<ResolversTypes['NotePatch'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PageInfoResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = {
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface PositiveIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['PositiveInt'], any> {
  name: 'PositiveInt';
}

export type ProfileResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Profile'] = ResolversParentTypes['Profile']> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  activeSessionIndex?: Resolver<ResolversTypes['NonNegativeInt'], ParentType, ContextType>;
  currentUserInfo?: Resolver<ResolversTypes['UserInfo'], ParentType, ContextType>;
  note?: Resolver<ResolversTypes['Note'], ParentType, ContextType, RequireFields<QuerynoteArgs, 'id'>>;
  notesConnection?: Resolver<ResolversTypes['NoteConnection'], ParentType, ContextType, RequireFields<QuerynotesConnectionArgs, 'first'>>;
  sessionCount?: Resolver<ResolversTypes['PositiveInt'], ParentType, ContextType>;
};

export type SignInPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['SignInPayload'] = ResolversParentTypes['SignInPayload']> = {
  sessionIndex?: Resolver<ResolversTypes['NonNegativeInt'], ParentType, ContextType>;
  userInfo?: Resolver<ResolversTypes['UserInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SignOutPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['SignOutPayload'] = ResolversParentTypes['SignOutPayload']> = {
  activeSessionIndex?: Resolver<Maybe<ResolversTypes['NonNegativeInt']>, ParentType, ContextType>;
  signedOut?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubscriptionResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = {
  noteCreated?: SubscriptionResolver<ResolversTypes['NoteCreatedPayload'], "noteCreated", ParentType, ContextType>;
  noteDeleted?: SubscriptionResolver<ResolversTypes['NoteDeletedPayload'], "noteDeleted", ParentType, ContextType>;
  noteUpdated?: SubscriptionResolver<ResolversTypes['NoteUpdatedPayload'], "noteUpdated", ParentType, ContextType>;
};

export type SwitchToSessionPayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['SwitchToSessionPayload'] = ResolversParentTypes['SwitchToSessionPayload']> = {
  activeSessionIndex?: Resolver<ResolversTypes['NonNegativeInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UpdateNotePayloadResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['UpdateNotePayload'] = ResolversParentTypes['UpdateNotePayload']> = {
  note?: Resolver<ResolversTypes['Note'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserInfoResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['UserInfo'] = ResolversParentTypes['UserInfo']> = {
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLResolversContext> = {
  Connection?: ConnectionResolvers<ContextType>;
  CreateNotePayload?: CreateNotePayloadResolvers<ContextType>;
  Date?: GraphQLScalarType;
  DeleteNotePayload?: DeleteNotePayloadResolvers<ContextType>;
  Edge?: EdgeResolvers<ContextType>;
  HexColorCode?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  NonNegativeInt?: GraphQLScalarType;
  Note?: NoteResolvers<ContextType>;
  NoteConnection?: NoteConnectionResolvers<ContextType>;
  NoteCreatedPayload?: NoteCreatedPayloadResolvers<ContextType>;
  NoteDeletedPayload?: NoteDeletedPayloadResolvers<ContextType>;
  NoteEdge?: NoteEdgeResolvers<ContextType>;
  NotePatch?: NotePatchResolvers<ContextType>;
  NotePreferences?: NotePreferencesResolvers<ContextType>;
  NotePreferencesPatch?: NotePreferencesPatchResolvers<ContextType>;
  NoteUpdatedPayload?: NoteUpdatedPayloadResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  PositiveInt?: GraphQLScalarType;
  Profile?: ProfileResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  SignInPayload?: SignInPayloadResolvers<ContextType>;
  SignOutPayload?: SignOutPayloadResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  SwitchToSessionPayload?: SwitchToSessionPayloadResolvers<ContextType>;
  UpdateNotePayload?: UpdateNotePayloadResolvers<ContextType>;
  UserInfo?: UserInfoResolvers<ContextType>;
};

export type DirectiveResolvers<ContextType = GraphQLResolversContext> = {
  auth?: authDirectiveResolver<any, any, ContextType>;
};
