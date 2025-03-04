import { IResource } from 'aws-cdk-lib/aws-apigateway';

import { isNonEmptyArray } from '../../../utils/src/array/is-non-empty-array';

export function getOrCreateResource(resource: IResource, path: string[]) {
  if (!isNonEmptyArray(path)) return resource;
  const part = path[0];
  let nextResource = resource.getResource(part);
  if (!nextResource) {
    nextResource = resource.addResource(part);
  }
  return getOrCreateResource(nextResource, path.slice(1));
}
