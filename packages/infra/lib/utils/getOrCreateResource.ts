import { IResource } from 'aws-cdk-lib/aws-apigateway';

export default function getOrCreateResource(resource: IResource, path: string[]) {
  if (path.length === 0) return resource;
  const part = path[0];
  let nextResource = resource.getResource(part);
  if (!nextResource) {
    nextResource = resource.addResource(part);
  }
  return getOrCreateResource(nextResource, path.slice(1));
}
