import { ApolloCache } from '@apollo/client';
import mitt from 'mitt';

import {
  Changeset,
  CollabServiceServerFacade,
  CollabServiceServerFacadeEvents,
  HeadRecord,
  TextRecord,
  CollabServiceServerFacadeRecord,
} from '../../../../collab2/src';
import { getFragmentData, gql } from '../../__generated__';

import {
  MapRecordCollabTextRecordFragmentFragment,
  MapRecordCollabTextRecordFragmentFragmentDoc,
} from '../../__generated__/graphql';

import { cacheRecordToCollabServerRecord } from './map-record';

const CacheRecordsFacadeHeadRecord_CollabTextFragment = gql(`
  fragment CacheRecordsFacadeHeadRecord_CollabTextFragment on CollabText {
    id
    headRecord {
      revision
      text
    }
  }
`);

const CacheRecordsFacadeTextAtRevision_CollabTextFragment = gql(`
  fragment CacheRecordsFacadeTextAtRevision_CollabTextFragment on CollabText {
    id
    textAtRevision(revision: $revision) {
      revision
      text
    }
  }
`);

const CacheRecordsFacadeReadRecords_CollabTextFragment = gql(`
  fragment CacheRecordsFacadeReadRecords_CollabTextFragment on CollabText {
    id
    recordConnection(after: $after, first: $first, before: $before, last: $last) {
      edges {
        node {
          ...MapRecord_CollabTextRecordFragment
        }
      }
    }
  }
`);

const CacheRecordsFacadeWatchHeadRecord_CollabTextFragment = gql(`
  fragment CacheRecordsFacadeWatchHeadRecord_CollabTextFragment on CollabText {
    id
    headRecord {
      revision
    }
  }
`);

const CacheRecordsFacadeWatchRecords_CollabTextFragment = gql(`
  fragment CacheRecordsFacadeWatchRecords_CollabTextFragment on CollabText {
    id
    recordConnection {
      edges {
        node {
          id
          revision
        }
      }
      pageInfo {
        hasPreviousPage
      }
    }
  }
`);

export class CacheRecordsFacade implements CollabServiceServerFacade {
  private readonly eventBus = mitt<CollabServiceServerFacadeEvents>();
  readonly on = this.eventBus.on.bind(this.eventBus);
  readonly off = this.eventBus.off.bind(this.eventBus);

  private readonly disposeHandlers: () => void;

  constructor(
    readonly cache: ApolloCache<unknown>,
    readonly collabTextDataId: string
  ) {
    const headObservable = cache.watchFragment({
      fragment: CacheRecordsFacadeWatchHeadRecord_CollabTextFragment,
      from: this.collabTextDataId,
      optimistic: false,
    });
    const headWatch = headObservable.subscribe((value) => {
      if (!value.complete) {
        return;
      }
      const headRecord = this.head();
      if (!headRecord) {
        return;
      }
      this.eventBus.emit('head:updated', {
        facade: this,
        headRecord,
      });
    });

    const recordsObservable = cache.watchFragment({
      fragment: CacheRecordsFacadeWatchRecords_CollabTextFragment,
      from: this.collabTextDataId,
      optimistic: false,
    });
    const recordsWatch = recordsObservable.subscribe((value) => {
      if (!value.complete) {
        return;
      }
      this.eventBus.emit('records:updated', {
        facade: this,
      });
    });

    this.disposeHandlers = () => {
      headWatch.unsubscribe();
      recordsWatch.unsubscribe();
    };
  }

  dispose() {
    this.disposeHandlers();
  }

  head(): HeadRecord | undefined {
    const collabText = this.cache.readFragment({
      id: this.collabTextDataId,
      fragment: CacheRecordsFacadeHeadRecord_CollabTextFragment,
    });

    if (!collabText) {
      return;
    }

    const headRecord = collabText.headRecord;

    return {
      revision: headRecord.revision,
      text: Changeset.fromText(headRecord.text),
    };
  }

  text(targetRevision?: number): TextRecord | undefined {
    const collabText = this.cache.readFragment({
      id: this.collabTextDataId,
      fragment: CacheRecordsFacadeTextAtRevision_CollabTextFragment,
      variables: {
        revision: targetRevision,
      },
    });

    if (!collabText) {
      return;
    }

    const record = collabText.textAtRevision;

    return {
      revision: record.revision,
      text: Changeset.fromText(record.text),
    };
  }

  range(
    startRevision: number,
    endRevision: number
  ): readonly CollabServiceServerFacadeRecord[] {
    const records = this.readRecords({
      after: startRevision - 1,
      first: endRevision - startRevision,
    });

    return records.map(cacheRecordToCollabServerRecord);
  }

  at(revision: number): CollabServiceServerFacadeRecord | undefined {
    const records = this.readRecords({
      after: revision - 1,
      first: 1,
    });

    const record = records[0];
    if (!record) {
      return;
    }

    return cacheRecordToCollabServerRecord(record);
  }

  *beforeIterable(beforeRevision: number): Iterable<CollabServiceServerFacadeRecord> {
    const records = this.readRecords({
      before: beforeRevision,
    });

    for (let i = records.length; i >= 0; i--) {
      const record = records[i];
      if (!record) {
        continue;
      }

      yield cacheRecordToCollabServerRecord(record);
    }

    return;
  }

  hasBefore(beforeRevision: number): boolean {
    const collabText = this.cache.readFragment({
      id: this.collabTextDataId,
      fragment: CacheRecordsFacadeWatchRecords_CollabTextFragment,
    });

    const recordConnection = collabText?.recordConnection;

    // Assume server has more records until queried
    if (!recordConnection) {
      return true;
    }

    const firstRecord = recordConnection.edges[0]?.node;
    if (!firstRecord) {
      return false;
    }

    if (firstRecord.revision < beforeRevision) {
      return true;
    }

    const isFirstEverRecord = firstRecord.revision <= 1;
    const serverHasMoreRecords = recordConnection.pageInfo.hasPreviousPage;

    return !isFirstEverRecord && serverHasMoreRecords;
  }

  private readRecords(variables: {
    after?: number;
    before?: number;
    first?: number;
    last?: number;
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
}
