import { CfnOutput, Duration, Fn, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import parseDomains, { Domain } from '../utils/parseDomains';
import { createCdkTableConstructs } from '~lambda-graphql/dynamodb/schema';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { CompositePrincipal, Role } from 'aws-cdk-lib/aws-iam';
import {
  AtlasBasic,
  CfnDatabaseUserPropsAwsiamType,
  AdvancedRegionConfigProviderName,
} from 'awscdk-resources-mongodbatlas';
import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import {
  AllowedMethods,
  CacheCookieBehavior,
  CacheHeaderBehavior,
  CachePolicy,
  CacheQueryStringBehavior,
  Distribution,
  FunctionCode,
  FunctionEventType,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  OriginRequestCookieBehavior,
  OriginRequestHeaderBehavior,
  OriginRequestPolicy,
  OriginRequestQueryStringBehavior,
  PriceClass,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
  Function,
} from 'aws-cdk-lib/aws-cloudfront';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { S3Origin, RestApiOrigin, HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { transpileTypeScriptAsFile } from '../../cloudfront-functions/transpile';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget, Route53RecordTarget } from 'aws-cdk-lib/aws-route53-targets';
import { CacheControl } from 'aws-cdk-lib/aws-codepipeline-actions';
import {
  BucketDeployment,
  BucketDeploymentProps,
  Source,
} from 'aws-cdk-lib/aws-s3-deployment';
import {
  LambdaHandlersConstruct,
  LambdaHandlersConstructProps,
} from '../constructs/lambda-handlers';
import { RestApiConstruct } from '../constructs/rest-api';

export interface NotesStackProps extends StackProps {
  customProps: {
    app: {
      sourcePath: string;
    };
    domains: string | Domain[];

    cloudFront: {
      certificateArn: string;
      disableCache?: boolean;
      viewerRequestFunctionPath: string;
    };

    mongoDb: {
      stsRegion?: string;

      // Require project and cluster name on deployment to prevent creating and deleting project every time
      atlas: {
        region?: string;
        profile?: string;
        orgId: string;
        projectName: string;
        clusterName: string;
        databaseName: string;
      };
    };

    api: {
      httpUrl: string;
      webSocketUrl: string;
    };

    lambda: LambdaHandlersConstructProps;
  };
}

export class NotesStack extends Stack {
  constructor(scope: Construct, id: string, props: NotesStackProps) {
    super(scope, id, props);
    const customProps = props.customProps;

    // WebSocket subscriptions with DynamoDB
    const dynamoDbWebSocketTables = createCdkTableConstructs(this, 'WebSocketTables');

    const handlers = new LambdaHandlersConstruct(
      this,
      'LambdaHandlers',
      customProps.lambda
    );
    handlers.getAll().forEach((lambda) => {
      lambda.addEnvironment(
        'DYNAMODB_CONNECTIONS_TABLE_NAME',
        dynamoDbWebSocketTables.connections.tableName
      );
      lambda.addEnvironment(
        'DYNAMODB_SUBSCRIPTIONS_TABLE_NAME',
        dynamoDbWebSocketTables.subscriptions.tableName
      );
    });

    dynamoDbWebSocketTables.connections.grantReadData(handlers.http);
    dynamoDbWebSocketTables.subscriptions.grantReadData(handlers.http);

    dynamoDbWebSocketTables.connections.grantReadWriteData(handlers.webSocket);
    dynamoDbWebSocketTables.subscriptions.grantReadWriteData(handlers.webSocket);

    // Setup MongoDB
    const mongoDbAtlasAuthRole = new Role(this, 'MongoDbAtlasAuthRole', {
      assumedBy: new CompositePrincipal(
        ...handlers.getAll().map((lambda) => lambda.grantPrincipal)
      ),
    });
    handlers.getAll().forEach((lambda) => {
      lambda.addEnvironment('MONGODB_ATLAS_ROLE_ARN', mongoDbAtlasAuthRole.roleArn);
    });

    const mongoDbAtlas = new AtlasBasic(this, 'MongoDbAtlasBasic', {
      profile: customProps.mongoDb.atlas.profile,
      projectProps: {
        orgId: customProps.mongoDb.atlas.orgId,
        name: customProps.mongoDb.atlas.projectName,
      },
      dbUserProps: {
        // User is created externally (IAM Role)
        databaseName: '$external',
        awsiamType: CfnDatabaseUserPropsAwsiamType.ROLE,
        username: mongoDbAtlasAuthRole.roleArn,
        // Must set password undefined so that only IAM Role authentication is available
        password: undefined,
      },
      ipAccessListProps: {
        accessList: [{ cidrBlock: '0.0.0.0/0', comment: 'Allow access from anywhere' }],
      },
      clusterProps: {
        // Free tier M0 Cluster
        name: customProps.mongoDb.atlas.clusterName,
        clusterType: 'REPLICASET',
        replicationSpecs: [
          {
            numShards: 1,
            advancedRegionConfigs: [
              {
                regionName: customProps.mongoDb.atlas.region,
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

    const mongoDbConnectionString = mongoDbAtlas.mCluster
      .getAtt('ConnectionStrings.StandardSrv')
      .toString();
    handlers.getAll().forEach((lambda) => {
      lambda.addEnvironment('MONGODB_ATLAS_URI_SRV', mongoDbConnectionString);
    });

    // Setup Rest API
    const restApi = new RestApiConstruct(this, 'RestApiConstruct', {
      url: customProps.api.httpUrl,
      handler: handlers.http,
    });

    const webSocketApi = new WebSocketApi(this, 'WebSocketApi', {
      apiName: 'Notes App WebSocketApi',
      description: 'Handles GraphQL subscriptions for Notes App',
      connectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          'WsConnectIntegration',
          handlers.webSocket
        ),
      },
      defaultRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          'WsMessageIntegration',
          handlers.webSocket
        ),
      },
      disconnectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          'WsDisconnectIntegration',
          handlers.webSocket
        ),
      },
    });

    const webSocketUrl = new URL(customProps.api.webSocketUrl);

    // WebSocket API stageName cannot contain any slashes
    const webSocketStageName = webSocketUrl.pathname.substring(1);
    if (webSocketStageName.includes('/')) {
      throw new Error(
        `'VITE_GRAPHQL_WS_URL' pathname cannot contain any slashes: ${webSocketStageName}`
      );
    }

    const webSocketStage = new WebSocketStage(this, 'WebSocketStage', {
      webSocketApi: webSocketApi,
      stageName: webSocketStageName,
      autoDeploy: true,
      throttle: {
        rateLimit: 500,
        burstLimit: 50,
      },
    });
    handlers.getAll().forEach((lambda) => {
      webSocketStage.grantManagementApiAccess(lambda);
    });

    const staticFilesBucket = new Bucket(this, 'MaybeAppStaticFiles', {
      versioned: false,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront, add APIs
    const responseHeadersPolicy = new ResponseHeadersPolicy(
      this,
      'SecureResponseHeadersPolicy',
      {
        comment: 'Adds a set of security headers to every response',
        securityHeadersBehavior: {
          strictTransportSecurity: {
            accessControlMaxAge: Duration.seconds(63072000),
            includeSubdomains: true,
            override: true,
          },
          contentTypeOptions: {
            override: true,
          },
          referrerPolicy: {
            referrerPolicy: HeadersReferrerPolicy.SAME_ORIGIN,
            override: true,
          },
          frameOptions: {
            frameOption: HeadersFrameOption.DENY,
            override: true,
          },
        },
      }
    );

    const domains = parseDomains(customProps.domains);

    const cdnDistribution = new Distribution(this, 'Distribution', {
      comment: 'CDN for Notes App with GraphQL API',
      priceClass: PriceClass.PRICE_CLASS_100,
      certificate: Certificate.fromCertificateArn(
        this,
        'MyCloudFrontCertificate',
        customProps.cloudFront.certificateArn
      ),
      domainNames: domains.map((d) => [d.primaryName, ...d.aliases]).flat(),
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new S3Origin(staticFilesBucket),
        compress: true,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy,
        cachePolicy: customProps.cloudFront.disableCache
          ? CachePolicy.CACHING_DISABLED
          : new CachePolicy(this, 'CacheByAcceptHeaderPolicy', {
              minTtl: Duration.seconds(1),
              maxTtl: Duration.seconds(31536000),
              defaultTtl: Duration.seconds(86400),
              headerBehavior: CacheHeaderBehavior.allowList('Accept'),
              queryStringBehavior: CacheQueryStringBehavior.all(),
              cookieBehavior: CacheCookieBehavior.none(),
              enableAcceptEncodingBrotli: true,
              enableAcceptEncodingGzip: true,
            }),
        functionAssociations: [
          {
            eventType: FunctionEventType.VIEWER_REQUEST,
            function: new Function(this, 'MainDomainNoSlashRewriteWebpFunction', {
              code: FunctionCode.fromFile({
                filePath: transpileTypeScriptAsFile(
                  customProps.cloudFront.viewerRequestFunctionPath,
                  {
                    replace: {
                      'process.env.PRIMARY_DOMAIN': domains[0]?.primaryName,
                      'export const exportedForTesting_handler = handler;': '',
                    },
                  }
                ),
              }),
            }),
          },
        ],
      },
      additionalBehaviors: {
        [restApi.url.pathname]: {
          origin: new RestApiOrigin(restApi.api),
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
          compress: true,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          responseHeadersPolicy,
        },
        [webSocketUrl.pathname]: {
          origin: new HttpOrigin(Fn.select(1, Fn.split('//', webSocketApi.apiEndpoint))),
          cachePolicy: CachePolicy.CACHING_DISABLED,
          originRequestPolicy: new OriginRequestPolicy(this, 'WebSocketPolicy', {
            comment: 'Policy for handling WebSockets',
            cookieBehavior: OriginRequestCookieBehavior.all(),
            headerBehavior: OriginRequestHeaderBehavior.allowList(
              'Sec-WebSocket-Key',
              'Sec-WebSocket-Version',
              'Sec-WebSocket-Protcol',
              'Sec-WebSocket-Accept',
              'Sec-WebSocket-Extensions'
            ),
            queryStringBehavior: OriginRequestQueryStringBehavior.none(),
          }),
        },
      },
      errorResponses: [
        {
          // Return app index.html when path not found in S3 bucket
          httpStatus: 403,
          ttl: Duration.seconds(10),
          responsePagePath: '/index.html',
          responseHttpStatus: 404,
        },
      ],
    });

    // Make CloudFront accessible through a domain
    domains.forEach((domain) => {
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
        target: RecordTarget.fromAlias(new CloudFrontTarget(cdnDistribution)),
      });

      domain.aliases.forEach((alias) => {
        new ARecord(this, `AliasARecord-${domain.zoneName}-${alias}`, {
          zone: hostedZone,
          recordName: alias,
          target: RecordTarget.fromAlias(new Route53RecordTarget(primaryRecord)),
        });
      });
    });

    // Deploy App static files
    const commonBucketDeploymentSettings: BucketDeploymentProps = {
      logRetention: RetentionDays.ONE_DAY,
      sources: [Source.asset(customProps.app.sourcePath)],
      destinationBucket: staticFilesBucket,
      cacheControl: [
        CacheControl.setPublic(),
        CacheControl.maxAge(Duration.seconds(31536000)),
        CacheControl.immutable(),
      ],
    };

    new BucketDeployment(this, 'AllExceptWebpDeployment', {
      ...commonBucketDeploymentSettings,
      exclude: ['*.webp'],
      // Invalidate cache when it's enabled
      ...(customProps.cloudFront.disableCache !== true && {
        distribution: cdnDistribution,
        distributionPaths: ['/*'],
      }),
    });

    new BucketDeployment(this, 'OnlyWebpDeployment', {
      ...commonBucketDeploymentSettings,
      exclude: ['*'],
      include: ['*.webp'],
      contentType: 'image/webp',
    });

    new CfnOutput(this, 'DistributionDomainName', {
      value: cdnDistribution.domainName,
    });
    new CfnOutput(this, 'MongoDbAtlasProjectName', {
      value: mongoDbAtlas.mProject.props.name,
    });
    new CfnOutput(this, 'MongoDbAtlasClusterName', {
      value: mongoDbAtlas.mCluster.props.name,
    });
    new CfnOutput(this, 'MongoDbAtlasConnectionString', {
      value: mongoDbConnectionString,
    });
    new CfnOutput(this, 'WebSocketUrl', {
      value: webSocketStage.url,
    });
  }
}
