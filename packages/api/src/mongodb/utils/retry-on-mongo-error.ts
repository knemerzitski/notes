import { MongoServerError } from 'mongodb';

import { RetryErrorCondFn } from '../../../../utils/src/retry-on-error';

export enum MongoErrorCodes {
  DUPLICATE_KEY_E11000 = '11000',
}

interface RetryOnMongoErrorOptions {
  maxRetries?: number;
  codes?: MongoErrorCodes[];
}

export function retryOnMongoError(options?: RetryOnMongoErrorOptions): RetryErrorCondFn {
  let retriesRemaining = options?.maxRetries;

  const codeSet = new Set(options?.codes?.map((code) => String(code)));

  return (err) => {
    if (!(err instanceof MongoServerError)) {
      return false;
    }

    if (retriesRemaining != null) {
      if (retriesRemaining <= 0) return false;
      retriesRemaining--;
    }

    if (codeSet.size > 0 && codeSet.has(String(err.code))) {
      return true;
    }

    return false;
  };
}
