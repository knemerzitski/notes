import isNonEmptyArray, { isNonEmptyMutableArray } from '~utils/array/isNonEmptyArray';

export interface Domain {
  zoneName: string;
  zoneId: string;
  primaryName: string;
  aliases: string[];
}

/**
 * Parses domains string into {@link Domain[]}
 * @param domains 'example.com,Z012345677890DADMMV,primary.example.com,alias.example.com'
 * @returns Domains object with at least one entry
 */
export default function parseDomains(domains: string | Domain[]): [Domain, ...Domain[]] {
  const parsedDomains = Array.isArray(domains)
    ? domains
    : domains
        .split(';')
        .map((group) => group.split(',').map((entry) => entry.trim()))
        .filter((group) => group.length >= 3)
        .map((group) => ({
          zoneName: group[0],
          zoneId: group[1],
          primaryName: group[2],
          aliases: group.slice(3),
        }));
  if (!isNonEmptyMutableArray(parsedDomains)) {
    throw new Error(
      `No valid domains found in "${domains}". Domain must be in format: [zoneName],[zoneId],[primaryName],[...aliases];...`
    );
  }

  return parsedDomains;
}
