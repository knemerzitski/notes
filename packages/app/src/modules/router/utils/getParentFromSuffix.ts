const SLASH = '/';

export default function getParentFromSuffix(
  pathPattern: string,
  locationPathname: string
) {
  const pathParts = pathPattern.split(SLASH);
  if (pathParts.length === 0) return locationPathname;

  const leadingSlash = locationPathname.startsWith(SLASH) ? SLASH : '';

  const locationParts = locationPathname.split(SLASH);

  const slicedPathname = locationParts
    .slice(0, locationParts.length - pathParts.length)
    .join(SLASH);

  if (leadingSlash && slicedPathname.length === 0) {
    return leadingSlash;
  }

  return slicedPathname;
}
