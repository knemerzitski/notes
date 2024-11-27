import { GraphQLServiceAction } from '../graphql/types';
import { simulateOfflineGraphQLServiceAction } from './components/SimulateOfflineToggleButton';

export const devGraphQLServiceActions: GraphQLServiceAction[] = import.meta.env.PROD
  ? []
  : [simulateOfflineGraphQLServiceAction];
