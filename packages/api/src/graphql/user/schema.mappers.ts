import { ObjectId } from 'mongodb';
import { ResolverTypeWrapper } from '../types.generated';

export interface PublicUserMapper {
  id(): ResolverTypeWrapper<ObjectId>;
  displayName(): ResolverTypeWrapper<string>;
}
