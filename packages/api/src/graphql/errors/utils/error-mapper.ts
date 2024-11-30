import { GraphQLError } from 'graphql/index.js';
import { isObjectLike } from '~utils/type-guards/is-object-like';

export class ErrorMapper {
  private readonly map = new Map();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  add<TErrorClass extends abstract new (...args: any) => any>(
    error: TErrorClass,
    handler: (error: InstanceType<TErrorClass>) => GraphQLError | undefined
  ) {
    this.map.set(error, handler);
  }

  get(error: unknown): GraphQLError | undefined {
    if (isObjectLike(error) && 'constructor' in error) {
      const handler = this.map.get(error.constructor);
      if (handler) {
        return handler(error);
      }
    }
    return;
  }
}
