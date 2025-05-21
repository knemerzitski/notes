import { ApolloCache } from '@apollo/client';

import { Logger } from '../../../../utils/src/logging';

import { Changeset } from '../../../../collab/src';
import { CacheEvictionTracker } from '../../graphql/utils/eviction-tracker';

import { identifyOrError } from '../../graphql/utils/identify';
import { StoreSetBuffer, Store } from '../../persistence/types';

import { getHeadRecord } from '../models/note/head-record';

import { parseUserNoteLinkId } from '../utils/id';

import { Deserializer } from './deserializer';
import { FieldCollabServiceFactory } from './field-collab-service-factory';
import { NoteLinkIsExternalTypingHistory } from './note-link-is-external-typing-history';
import { NoteLinkRecordsFacade } from './note-link-records-facade';

import { Serializer } from './serializer';

export interface CollabFacade<TFieldName extends string> {
  readonly fieldCollab: ReturnType<FieldCollabServiceFactory<TFieldName>['create']>;
}

interface InitStatus {
  readonly isPending: boolean;
  readonly completion: Promise<void>;
}

interface FacadeGetter<TFieldName extends string> {
  /*
  Only accessible when `initStatus.isPending` is false.
  */
  get: () => CollabFacade<TFieldName>;
  readonly initStatus: InitStatus;
}

interface PrivateItem<TFieldName extends string> {
  readonly facadeGetter: FacadeGetter<TFieldName>;
  readonly userNoteLinkIdIsExternalTypingHistory: NoteLinkIsExternalTypingHistory;
  readonly userNoteLinkIdToRecordsFacade: NoteLinkRecordsFacade;
  readonly serializer: Serializer;
  stopEvictionTracking?: ReturnType<CacheEvictionTracker['track']>;
}

export class CollabServiceManager<TFieldName extends string> {
  private readonly byUserNoteLinkId = new Map<string, PrivateItem<TFieldName>>();

  constructor(
    private readonly ctx: {
      readonly logger?: Logger;
      readonly factory: FieldCollabServiceFactory<TFieldName>;
      readonly cache: Pick<
        ApolloCache<unknown>,
        'watchFragment' | 'readFragment' | 'identify' | 'readQuery'
      >;
      readonly evictionTracker: CacheEvictionTracker;
      readonly store: Pick<Store, 'get'>;
      readonly storeBuffer: Pick<StoreSetBuffer, 'has' | 'remove' | 'set'>;
      readonly keyPrefix: string;
    }
  ) {}

  async loadIfExists(
    userNoteLinkId: string
  ): Promise<CollabFacade<TFieldName> | undefined> {
    const item = this.byUserNoteLinkId.get(userNoteLinkId);
    if (!item) {
      return;
    }

    await item.facadeGetter.initStatus.completion;

    return item.facadeGetter.get();
  }

  async loadOrCreate(userNoteLinkId: string): Promise<CollabFacade<TFieldName>> {
    const item = this.getOrCreate(userNoteLinkId);
    await item.initStatus.completion;
    return item.get();
  }

  getIfExists(userNoteLinkId: string): FacadeGetter<TFieldName> | undefined {
    return this.byUserNoteLinkId.get(userNoteLinkId)?.facadeGetter;
  }

  getOrCreate(userNoteLinkId: string): FacadeGetter<TFieldName> {
    let item = this.byUserNoteLinkId.get(userNoteLinkId);
    if (!item) {
      item = this.create(userNoteLinkId);
      this.byUserNoteLinkId.set(userNoteLinkId, item);
    }

    return item.facadeGetter;
  }

  changeId(sourceUserNoteLinkId: string, targetUserNoteLinkId: string) {
    this.ctx.logger?.debug('changeId', { sourceUserNoteLinkId, targetUserNoteLinkId });
    const item = this.byUserNoteLinkId.get(sourceUserNoteLinkId);
    if (!item) {
      throw new Error(`Unknown id "${sourceUserNoteLinkId}"`);
    }

    item.userNoteLinkIdToRecordsFacade.updateUserNoteLinkId(targetUserNoteLinkId);
    item.userNoteLinkIdIsExternalTypingHistory.updateUserNoteLinkId(targetUserNoteLinkId);
    item.stopEvictionTracking?.();
    item.stopEvictionTracking = this.trackEviction(targetUserNoteLinkId);
    item.serializer.updateKey(this.getStoreKey(targetUserNoteLinkId));

    // Delete source on next tick if it is still used by UI to avoid flickering
    void Promise.resolve().then(() => {
      this.byUserNoteLinkId.delete(sourceUserNoteLinkId);
    });

    this.byUserNoteLinkId.set(targetUserNoteLinkId, item);
    return item;
  }

  newInstance(options?: Parameters<typeof this.ctx.factory.create>[0]) {
    return this.ctx.factory.create(options);
  }

  parseText(value: string) {
    return this.ctx.factory.parseText(value);
  }

  private create(userNoteLinkId: string): PrivateItem<TFieldName> {
    this.ctx.logger?.debug('create', userNoteLinkId);
    const externalTypingHistory = new NoteLinkIsExternalTypingHistory(userNoteLinkId);
    const recordsFacade = new NoteLinkRecordsFacade(userNoteLinkId, this.ctx.cache);

    const fieldCollab = this.newInstance({
      service: {
        isExternalTypingHistory: externalTypingHistory.fn,
        serverFacade: recordsFacade.facade,
      },
    });

    const serializer = new Serializer(this.getStoreKey(userNoteLinkId), {
      service: fieldCollab.service,
      store: this.ctx.storeBuffer,
    });

    // Deserialization
    let isDeserializing = true;
    const deserializer = new Deserializer(
      this.getStoreKey(userNoteLinkId),
      fieldCollab.service
    );

    const deserializingPromise = deserializer
      .deserialize(this.ctx.store, {
        onEmpty: () => {
          const { noteId } = parseUserNoteLinkId(userNoteLinkId);
          // Nothing is saved, use headRecord from ApolloCache
          const headRecord = getHeadRecord(
            {
              id: noteId,
            },
            this.ctx.cache
          );

          if (headRecord && headRecord.text !== '') {
            fieldCollab.service.reset({
              revision: headRecord.revision,
              text: Changeset.fromText(headRecord.text),
            });
          }
        },
      })
      .finally(() => {
        isDeserializing = false;
        serializer.listen();
      });

    const facade: CollabFacade<TFieldName> = {
      fieldCollab,
    };

    return {
      facadeGetter: {
        get() {
          if (isDeserializing) {
            throw new Error('Illegal access: CollabFacade is loading.');
          }
          return facade;
        },
        initStatus: {
          get isPending() {
            return isDeserializing;
          },
          completion: deserializingPromise,
        },
      },
      serializer,
      userNoteLinkIdIsExternalTypingHistory: externalTypingHistory,
      userNoteLinkIdToRecordsFacade: recordsFacade,
      stopEvictionTracking: this.trackEviction(userNoteLinkId),
    };
  }

  private remove(userNoteLinkId: string) {
    this.ctx.logger?.debug('remove', userNoteLinkId);

    const item = this.byUserNoteLinkId.get(userNoteLinkId);
    if (!item) {
      return;
    }

    this.byUserNoteLinkId.delete(userNoteLinkId);

    item.userNoteLinkIdToRecordsFacade.facade.dispose();
  }

  private trackEviction(userNoteLinkId: string) {
    return this.ctx.evictionTracker.track(
      {
        __typename: 'UserNoteLink',
        id: userNoteLinkId,
      },
      () => {
        this.remove(userNoteLinkId);
      },
      {
        stopOnEvicted: true,
      }
    );
  }

  private getStoreKey(userNoteLinkId: string) {
    const dataId = identifyOrError(
      {
        __typename: 'UserNoteLink',
        id: userNoteLinkId,
      },
      this.ctx.cache
    );

    return `${this.ctx.keyPrefix}${dataId}`;
  }
}
