import { ApolloCache } from '@apollo/client';

import { InitializeModuleContextOptions } from '../graphql/types';
import { CacheEvictionTracker } from '../graphql/utils/eviction-tracker';
import { Store, StoreSetBuffer } from '../persistence/types';

import { CollabServiceManager } from './collab-manager';
import { FieldCollabServiceFactory } from './collab-manager/field-collab-service-factory';
import { NoteTextFieldName } from './types';

declare module '../graphql/types' {
  interface ModuleContext {
    readonly note: Readonly<ReturnType<typeof noteContext>>;
  }

  interface InitializeModuleContextOptions {
    readonly cache: ApolloCache<unknown>;
    readonly store: Pick<Store, 'get'>;
    readonly storeBuffer: Pick<StoreSetBuffer, 'set' | 'has' | 'remove'>;
    readonly evictionTracker: CacheEvictionTracker;
    readonly collabManager: {
      readonly storeKeyPrefix: string;
    };
  }
}

export const noteContext = function (ctx: InitializeModuleContextOptions) {
  return {
    collabManager: new CollabServiceManager({
      logger: ctx.logger?.extend('CollabServiceManager'),
      factory: new FieldCollabServiceFactory({
        logger: ctx.logger?.extend('collab'),
        fieldNames: Object.values(NoteTextFieldName),
        fallbackFieldName: NoteTextFieldName.CONTENT,
      }),
      cache: ctx.cache,
      evictionTracker: ctx.evictionTracker,
      storeBuffer: ctx.storeBuffer,
      store: ctx.store,
      keyPrefix: ctx.collabManager.storeKeyPrefix,
    }),
  };
};
