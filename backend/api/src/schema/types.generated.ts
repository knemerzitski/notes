import { GraphQLResolveInfo } from 'graphql';
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
};

export type AuthProvider =
  | 'GOOGLE';

export type CreateNoteInput = {
  content: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Create a new note belonging to a user of active session */
  createNote?: Maybe<Note>;
  /** Delete note by ID belonging to a user of active session */
  deleteNote: Scalars['Boolean']['output'];
  signIn: Scalars['Boolean']['output'];
  signOut: Scalars['Boolean']['output'];
  /** Change session to new index from http-only cookie */
  switchToSession: Scalars['Boolean']['output'];
  /** Update note by ID belonging to a user of active session */
  updateNote: Scalars['Boolean']['output'];
};


export type MutationcreateNoteArgs = {
  input: CreateNoteInput;
};


export type MutationdeleteNoteArgs = {
  id: Scalars['ID']['input'];
};


export type MutationsignInArgs = {
  input: SignInInput;
};


export type MutationswitchToSessionArgs = {
  index: Scalars['Int']['input'];
};


export type MutationupdateNoteArgs = {
  input: UpdateNoteInput;
};

export type Note = {
  __typename?: 'Note';
  /** Note text contents */
  content: Scalars['String']['output'];
  /** Note unique ID */
  id: Scalars['ID']['output'];
  /** Note title */
  title: Scalars['String']['output'];
  /** User who owns this note */
  userId: Scalars['ID']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Currently active session index saved in http-only cookie */
  activeSessionIndex?: Maybe<Scalars['Int']['output']>;
  /** Get note by ID belonging to a user of active session */
  note?: Maybe<Note>;
  /** Get all notes belonging to a user of active session */
  notes?: Maybe<Array<Note>>;
  /** Count of sessions saved in http-only cookie */
  sessionCount?: Maybe<Scalars['Int']['output']>;
};


export type QuerynoteArgs = {
  id: Scalars['String']['input'];
};

export type Role =
  | 'USER';

export type Session = {
  __typename?: 'Session';
  /** Session ID */
  id: Scalars['ID']['output'];
  /** User that is using this session */
  userId: Scalars['ID']['output'];
};

export type SignInInput = {
  provider: AuthProvider;
  token: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** New created note TODO subscriptions only for testing, lacking auth... */
  noteCreated: Note;
  /** Removed note ID TODO subscriptions only for testing, lacking auth... */
  noteDeleted: Scalars['ID']['output'];
  /** Updated note TODO subscriptions only for testing, lacking auth... */
  noteUpdated: Note;
};

export type UpdateNoteInput = {
  content: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};

export type User = {
  __typename?: 'User';
  /** User unique ID */
  id: Scalars['ID']['output'];
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

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



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AuthProvider: AuthProvider;
  CreateNoteInput: CreateNoteInput;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Note: ResolverTypeWrapper<Note>;
  Query: ResolverTypeWrapper<{}>;
  Role: Role;
  Session: ResolverTypeWrapper<Session>;
  SignInInput: SignInInput;
  Subscription: ResolverTypeWrapper<{}>;
  UpdateNoteInput: UpdateNoteInput;
  User: ResolverTypeWrapper<User>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  CreateNoteInput: CreateNoteInput;
  String: Scalars['String']['output'];
  Mutation: {};
  Boolean: Scalars['Boolean']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Note: Note;
  Query: {};
  Session: Session;
  SignInInput: SignInInput;
  Subscription: {};
  UpdateNoteInput: UpdateNoteInput;
  User: User;
};

export type authDirectiveArgs = {
  requires?: Maybe<Role>;
};

export type authDirectiveResolver<Result, Parent, ContextType = GraphQLResolversContext, Args = authDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type MutationResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createNote?: Resolver<Maybe<ResolversTypes['Note']>, ParentType, ContextType, RequireFields<MutationcreateNoteArgs, 'input'>>;
  deleteNote?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteNoteArgs, 'id'>>;
  signIn?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationsignInArgs, 'input'>>;
  signOut?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  switchToSession?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationswitchToSessionArgs, 'index'>>;
  updateNote?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationupdateNoteArgs, 'input'>>;
};

export type NoteResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Note'] = ResolversParentTypes['Note']> = {
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  activeSessionIndex?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['Note']>, ParentType, ContextType, RequireFields<QuerynoteArgs, 'id'>>;
  notes?: Resolver<Maybe<Array<ResolversTypes['Note']>>, ParentType, ContextType>;
  sessionCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type SessionResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Session'] = ResolversParentTypes['Session']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubscriptionResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = {
  noteCreated?: SubscriptionResolver<ResolversTypes['Note'], "noteCreated", ParentType, ContextType>;
  noteDeleted?: SubscriptionResolver<ResolversTypes['ID'], "noteDeleted", ParentType, ContextType>;
  noteUpdated?: SubscriptionResolver<ResolversTypes['Note'], "noteUpdated", ParentType, ContextType>;
};

export type UserResolvers<ContextType = GraphQLResolversContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLResolversContext> = {
  Mutation?: MutationResolvers<ContextType>;
  Note?: NoteResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Session?: SessionResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};

export type DirectiveResolvers<ContextType = GraphQLResolversContext> = {
  auth?: authDirectiveResolver<any, any, ContextType>;
};
