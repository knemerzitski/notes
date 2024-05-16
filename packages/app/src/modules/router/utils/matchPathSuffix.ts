const SLASH = '/';

/*

'note/:id?', '/u/0/note/noteid',

noteid - :id? dynamic match ok
note - note match ok
0   - __ match ok, empty end

*/

export default function matchPathSuffix(pathsPatterns: string[], locationPathname: string) {
  const locationParts = locationPathname.split(SLASH);
  for (const path of pathsPatterns) {
    const pathParts = path.split(SLASH);
    let foundMatch = true;
    for (
      let i = pathParts.length - 1, j = locationParts.length - 1;
      i >= 0 && j >= 0;
      i--, j--
    ) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const pathPart = pathParts[i]!;
      if (!pathPart.startsWith(':')) {
        if (pathPart.startsWith('*')) {
          break;
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const locationPart = locationParts[j]!;
        if (pathPart !== locationPart) {
          foundMatch = false;
          break;
        }
      }
    }
    if (foundMatch) {
      return path;
    }
  }
  return;
}
