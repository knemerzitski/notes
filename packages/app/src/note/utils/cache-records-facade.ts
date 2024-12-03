import { ApolloCache } from '@apollo/client';
import mitt, { Emitter } from 'mitt';
import { CollabServiceRecord } from '~collab/client/collab-service';
import {
  ServerRecordsFacade,
  ServerRecordsFacadeEvents,
} from '~collab/client/user-records';

import { RevisionChangeset } from '~collab/records/record';

import { getFragmentData, gql } from '../../__generated__';

import {
  MapRecordCollabTextRecordFragmentFragment,
  MapRecordCollabTextRecordFragmentFragmentDoc,
} from '../../__generated__/graphql';
import { identifyOrError } from '../../graphql/utils/identify';

import { getCollabTextId } from './id';

import { cacheRecordToCollabServiceRecord } from './map-record';

const CacheRecordsFacadeTextAtRevision_CollabTextFragment = gql(`
  fragment CacheRecordsFacadeTextAtRevision_CollabTextFragment on CollabText {
    id
    textAtRevision(revision: $revision) {
      revision
      changeset
    }
  }
`);

const CacheRecordsFacadeReadRecords_CollabTextFragment = gql(`
  fragment CacheRecordsFacadeReadRecords_CollabTextFragment on CollabText {
    id
    recordConnection(after: $after, first: $first) {
      edges {
        node {
          ...MapRecord_CollabTextRecordFragment
        }
      }
    }
  }
`);

const CacheRecordsFacadeWatch_CollabTextFragment = gql(`
  fragment CacheRecordsFacadeWatch_CollabTextFragment on CollabText {
    id
    recordConnection {
      edges {
        node {
          id
        }
      }
    }
  }
`);

export class CacheRecordsFacade implements ServerRecordsFacade<CollabServiceRecord> {
  private readonly _eventBus: Emitter<ServerRecordsFacadeEvents<CollabServiceRecord>> =
    mitt();
  get eventBus(): Pick<
    Emitter<ServerRecordsFacadeEvents<CollabServiceRecord>>,
    'on' | 'off'
  > {
    return this._eventBus;
  }

  private readonly cache;
  private readonly cacheWatchSubscription;

  private readonly collabTextDataId;

  private readonly initialTailText;

  private readonly noteId;

  get tailText(): RevisionChangeset {
    const tailText = this.readTextAtRevision();
    return tailText ?? this.initialTailText;
  }

  constructor({
    initialTailText,
    cache,
    noteId,
  }: {
    initialTailText: RevisionChangeset;
    cache: ApolloCache<unknown>;
    noteId: string;
  }) {
    this.noteId = noteId;
    this.initialTailText = initialTailText;
    this.cache = cache;

    this.collabTextDataId = identifyOrError(
      {
        __typename: 'CollabText',
        id: getCollabTextId(noteId),
      },
      cache
    );

    const observable = cache.watchFragment({
      fragment: CacheRecordsFacadeWatch_CollabTextFragment,
      from: this.collabTextDataId,
      optimistic: false,
    });

    this.cacheWatchSubscription = observable.subscribe((value) => {
      if (!value.complete) {
        return;
      }
      this._eventBus.emit('recordsUpdated', {
        source: this,
      });
    });
  }

  cleanUp() {
    this.cacheWatchSubscription.unsubscribe();
  }

  readTextAtRevision(revision?: number): RevisionChangeset | undefined {
    const collabText = this.cache.readFragment({
      id: this.collabTextDataId,
      fragment: CacheRecordsFacadeTextAtRevision_CollabTextFragment,
      variables: {
        revision,
      },
    });

    if (!collabText) {
      return;
    }

    return collabText.textAtRevision;
  }

  readRecords(variables: {
    before?: number;
    after?: number;
  }): MapRecordCollabTextRecordFragmentFragment[] {
    const collabText = this.cache.readFragment({
      id: this.collabTextDataId,
      fragment: CacheRecordsFacadeReadRecords_CollabTextFragment,
      fragmentName: 'CacheRecordsFacadeReadRecords_CollabTextFragment',
      variables,
    });

    if (!collabText) {
      return [];
    }

    return collabText.recordConnection.edges.map((edge) =>
      getFragmentData(MapRecordCollabTextRecordFragmentFragmentDoc, edge.node)
    );
  }

  newestRecordsIterable(headRevision: number): Iterable<Readonly<CollabServiceRecord>> {
    const records = this.readRecords({
      before: headRevision + 1,
    });
    if (records.length === 0) {
      return {
        [Symbol.iterator]: () => ({
          next: () => {
            return {
              done: true,
              value: undefined,
            };
          },
        }),
      };
    }

    let index = records.length - 1;

    return {
      [Symbol.iterator]: () => ({
        next: () => {
          const value = records[index--];
          if (value != null) {
            return {
              done: false,
              value: cacheRecordToCollabServiceRecord(value),
            };
          } else {
            return { done: true, value };
          }
        },
      }),
    };
  }

  getTextAt(revision: number): Readonly<RevisionChangeset> {
    const revisionChangeset = this.readTextAtRevision(revision);
    if (!revisionChangeset) {
      throw new Error(
        `Failed to get note "${this.noteId}" text at revision "${revision}"`
      );
    }

    return revisionChangeset;
  }

  hasTextAt(revision: number) {
    return Boolean(this.readTextAtRevision(revision));
  }
}
