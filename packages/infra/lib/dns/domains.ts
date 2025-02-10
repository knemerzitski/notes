import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget, Route53RecordTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

import { isNonEmptyMutableArray } from '~utils/array/is-non-empty-array';

export interface DomainsProps {
  definitions: string | DomainDefinition[];
}

export class Domains extends Construct {
  readonly definitions: ReturnType<typeof parseDomains>;

  constructor(scope: Construct, id: string, props: DomainsProps) {
    super(scope, id);

    this.definitions = parseDomains(props.definitions);
  }

  addDistributionTaret(distributionTarget: Distribution) {
    this.definitions.forEach((domain) => {
      const hostedZone = HostedZone.fromHostedZoneAttributes(
        this,
        `Zone-${domain.zoneName}`,
        {
          hostedZoneId: domain.zoneId,
          zoneName: domain.zoneName,
        }
      );

      const primaryRecord = new ARecord(this, `ARecord-${domain.zoneName}`, {
        zone: hostedZone,
        recordName: domain.primaryName,
        target: RecordTarget.fromAlias(new CloudFrontTarget(distributionTarget)),
      });

      domain.aliases.forEach((alias) => {
        new ARecord(this, `AliasARecord-${domain.zoneName}-${alias}`, {
          zone: hostedZone,
          recordName: alias,
          target: RecordTarget.fromAlias(new Route53RecordTarget(primaryRecord)),
        });
      });
    });
  }

  getPrimaryDomain() {
    return this.definitions[0].primaryName;
  }
}

export interface DomainDefinition {
  zoneName: string;
  zoneId: string;
  primaryName: string;
  aliases: string[];
}

/**
 * Parses domains string into {@link DomainDefinition[]}
 * @param domains 'example.com,Z012345677890DADMMV,primary.example.com,alias.example.com'
 * @returns Domains object with at least one entry
 */
export function parseDomains(
  domains: string | DomainDefinition[]
): [DomainDefinition, ...DomainDefinition[]] {
  const parsedDomains = Array.isArray(domains)
    ? domains
    : domains
        .split(';')
        .map((group) => group.split(',').map((entry) => entry.trim()))
        .filter(assertHas3Elements)
        .map((group) => ({
          zoneName: group[0],
          zoneId: group[1],
          primaryName: group[2],
          aliases: group.slice(3),
        }));
  if (!isNonEmptyMutableArray(parsedDomains)) {
    throw new Error(
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      `No valid domains found in "${domains.toString()}". Domain must be in format: [zoneName],[zoneId],[primaryName],[...aliases];...`
    );
  }

  return parsedDomains;
}

function assertHas3Elements<T>(arr: readonly T[]): arr is [T, T, T, ...T[]] {
  return (
    arr.length >= 3 &&
    arr[0] !== undefined &&
    arr[1] !== undefined &&
    arr[2] !== undefined
  );
}
