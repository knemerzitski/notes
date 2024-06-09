import { Role } from 'aws-cdk-lib/aws-iam';
import {
  AtlasBasic,
  CfnDatabaseUserPropsAwsiamType,
  AdvancedRegionConfigProviderName,
} from 'awscdk-resources-mongodbatlas';
import { Construct } from 'constructs';

export interface StateMongoDBProps {
  role: Role;
  // Require project and cluster name on deployment to prevent creating and deleting project every time
  atlas: {
    region?: string;
    profile?: string;
    orgId: string;
    projectName: string;
    clusterName: string;
    databaseName: string;
  };
}

export class StateMongoDB extends Construct {
  readonly connectionString;
  readonly atlas: AtlasBasic;

  constructor(scope: Construct, id: string, props: StateMongoDBProps) {
    super(scope, id);

    this.atlas = new AtlasBasic(this, 'AtlasBasic', {
      profile: props.atlas.profile,
      projectProps: {
        orgId: props.atlas.orgId,
        name: props.atlas.projectName,
      },
      dbUserProps: {
        // User is created externally (IAM Role)
        databaseName: '$external',
        awsiamType: CfnDatabaseUserPropsAwsiamType.ROLE,
        username: props.role.roleArn,
        // Must set password undefined so that only IAM Role authentication is available
        password: undefined,
      },
      ipAccessListProps: {
        accessList: [{ cidrBlock: '0.0.0.0/0', comment: 'Allow access from anywhere' }],
      },
      clusterProps: {
        // Free tier M0 Cluster
        name: props.atlas.clusterName,
        clusterType: 'REPLICASET',
        replicationSpecs: [
          {
            numShards: 1,
            advancedRegionConfigs: [
              {
                regionName: props.atlas.region,
                providerName: AdvancedRegionConfigProviderName.TENANT,
                backingProviderName: 'AWS',
                priority: 7,
                electableSpecs: {
                  ebsVolumeType: 'STANDARD',
                  instanceSize: 'M0',
                  nodeCount: 3,
                },
                analyticsSpecs: {
                  ebsVolumeType: 'STANDARD',
                  instanceSize: 'M0',
                  nodeCount: 1,
                },
              },
            ],
          },
        ],
      },
    });

    this.connectionString = this.atlas.mCluster
      .getAtt('ConnectionStrings.StandardSrv')
      .toString();
  }
}
