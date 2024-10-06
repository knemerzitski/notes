import { CreateTypePoliciesFn } from '../graphql/types';
import { DevicePreferences } from './policies/DevicePreferences';
import { Query } from './policies/Query';

export const devicePreferencesPolicies: CreateTypePoliciesFn = function (ctx) {
  return {
    Query: Query(ctx),
    DevicePreferences: DevicePreferences(ctx),
  };
};
