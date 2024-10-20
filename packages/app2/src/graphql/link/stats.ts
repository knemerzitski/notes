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
  private readonly statsByUser;
  private readonly definedStatsByUser;

  constructor() {
    super();
    this.statsByUser = new Map<string, UserStats>();
    this.definedStatsByUser = new DefinedMap(this.statsByUser, () => new UserStats());
  }

  getEventBus(
    userId?: string | undefined
  ): Pick<Emitter<AllOperationStats>, 'on' | 'off'> {
    return this.definedStatsByUser.get(userId ?? '').eventBus;
  }

  getStats(userId?: string | undefined): ReadonlyDeep<AllOperationStats> {
    return this.definedStatsByUser.get(userId ?? '').byType;
  }

  /**
   * @returns Ongoing operations count. Excluding subscriptions.
   */
  getOngoingCount(userId?: string | undefined) {
    const globalStats = this.getStats();
    const userStats = this.getStats(userId);

    return (
      globalStats.query.ongoing +
      globalStats.mutation.ongoing +
      userStats.query.ongoing +
      userStats.mutation.ongoing
    );
  }

  getOngoingQueriesCount(userId?: string | undefined) {
    const globalStats = this.getStats();
    const userStats = this.getStats(userId);

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

    const userStats = this.definedStatsByUser.get(userId);
    const stats = userStats.byType[type];
    stats.ongoing++;
    stats.total++;

    userStats.eventBus.emit(type, { ...stats });

    return new Observable<FetchResult>((observer: Observer<FetchResult>) => {
      const sub = forward(operation).subscribe(observer);
      return () => {
        stats.ongoing--;
        userStats.eventBus.emit(type, { ...stats });
        sub.unsubscribe();
      };
    });
  }
}

class UserStats {
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
