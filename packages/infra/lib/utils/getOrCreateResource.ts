import { IResource } from 'aws-cdk-lib/aws-apigateway';

import isNonEmptyArray from '~utils/array/isNonEmptyArray';

export default function getOrCreateResource(resource: IResource, path: string[]) {
  if (!isNonEmptyArray(path)) return resource;
  const part = path[0];
  let nextResource = resource.getResource(part);
  if (!nextResource) {
    nextResource = resource.addResource(part);
  }
  return getOrCreateResource(nextResource, path.slice(1));
}
