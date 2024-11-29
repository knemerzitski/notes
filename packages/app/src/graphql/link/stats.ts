import { ApolloLink, Operation, NextLink, FetchResult } from '@apollo/client';
import { Observable, Observer, getMainDefinition } from '@apollo/client/utilities';
import { OperationTypeNode, Kind } from 'graphql';
import mitt, { Emitter } from 'mitt';
import { getOperationOrRequestUserId } from './current-user';
import { DefinedMap } from '~utils/map/defined-map';
import { ReadonlyDeep } from '~utils/types';

interface OperationStats {
  ongoing: number;
  total: number;
}

export type AllOperationStats = { [Key in OperationTypeNode]: OperationStats };
export type UserAllOperationStats = { [Key in string]: AllOperationStats };

/**
 * Keeps track of how many operations are ongoing and how many
 * have been run in total.
 */
export class StatsLink extends ApolloLink {
  private readonly globalStatsData;
  private readonly statsDataByUser;
  private readonly definedStatsDataByUser;

  constructor() {
    super();
    this.globalStatsData = new StatsData();
    this.statsDataByUser = new Map<string, StatsData>();
    this.definedStatsDataByUser = new DefinedMap(
      this.statsDataByUser,
      () => new StatsData()
    );
  }

  getGlobalEventBus(): Pick<Emitter<AllOperationStats>, 'on' | 'off'> {
    return this.globalStatsData.eventBus;
  }

  getGlobalStats(): ReadonlyDeep<AllOperationStats> {
    return this.globalStatsData.byType;
  }

  getUserEventBus(
    userId?: string | undefined
  ): Pick<Emitter<AllOperationStats>, 'on' | 'off'> {
    return this.definedStatsDataByUser.get(userId ?? '').eventBus;
  }

  getUserStats(userId?: string | undefined): ReadonlyDeep<AllOperationStats> {
    return this.definedStatsDataByUser.get(userId ?? '').byType;
  }

  /**
   * @returns Ongoing operations count. Excluding subscriptions.
   */
  getOngoingCount(userId?: string | undefined) {
    const globalStats = this.getUserStats();
    const userStats = this.getUserStats(userId);

    return (
      globalStats.query.ongoing +
      globalStats.mutation.ongoing +
      userStats.query.ongoing +
      userStats.mutation.ongoing
    );
  }

  getOngoingQueriesCount(userId?: string | undefined) {
    const globalStats = this.getUserStats();
    const userStats = this.getUserStats(userId);

    return globalStats.query.ongoing + userStats.query.ongoing;
  }

  public override request(
    operation: Operation,
    forward?: NextLink
  ): Observable<FetchResult> | null {
    if (forward == null) {
      return null;
    }

    const definition = getMainDefinition(operation.query);
    if (definition.kind !== Kind.OPERATION_DEFINITION) {
      return forward(operation);
    }
    const type = definition.operation;
    const userId = getOperationOrRequestUserId(operation) ?? '';

    const userStatsData = this.definedStatsDataByUser.get(userId);
    const userStats = userStatsData.byType[type];
    userStats.ongoing++;
    userStats.total++;

    const globalStats = this.globalStatsData.byType[type];
    globalStats.ongoing++;
    globalStats.total++;

    this.globalStatsData.eventBus.emit(type, { ...userStats });
    userStatsData.eventBus.emit(type, { ...userStats });

    const observable = forward(operation);

    return new Observable<FetchResult>((observer: Observer<FetchResult>) => {
      const sub = observable.subscribe(observer);
      return () => {
        userStats.ongoing--;
        globalStats.ongoing--;

        this.globalStatsData.eventBus.emit(type, { ...userStats });
        userStatsData.eventBus.emit(type, { ...userStats });

        sub.unsubscribe();
      };
    });
  }
}

class StatsData {
  readonly eventBus = mitt<AllOperationStats>();
  readonly byType: AllOperationStats = {
    query: {
      ongoing: 0,
      total: 0,
    },
    mutation: {
      ongoing: 0,
      total: 0,
    },
    subscription: {
      ongoing: 0,
      total: 0,
    },
  };
}
