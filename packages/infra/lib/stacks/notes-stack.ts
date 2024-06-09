import { CfnOutput, Duration, Fn, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import parseDomains, { Domain } from '../utils/parseDomains';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { CompositePrincipal, Role } from 'aws-cdk-lib/aws-iam';
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
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget, Route53RecordTarget } from 'aws-cdk-lib/aws-route53-targets';
import { CacheControl } from 'aws-cdk-lib/aws-codepipeline-actions';
import {
  BucketDeployment,
  BucketDeploymentProps,
  Source,
} from 'aws-cdk-lib/aws-s3-deployment';
import { HttpRestApi } from '../api/http-rest-api';
import {
  TranspileOptionsAsFile,
  eslintFile,
  transpileTypeScriptToFile,
} from '../utils/transpile-ts';
import { ModuleKind, ScriptTarget } from 'typescript';
import { LambdaHandlers, LambdaHandlersProps } from '../compute/lambda-handlers';
import { WebSocketDynamoDB } from '../database/websocket-dynamodb';
import { StateMongoDB, StateMongoDBProps } from '../database/state-mongodb';
import { SubscriptionsWebSocketApi } from '../api/subscriptions-websocket-api';

export interface NotesStackProps extends StackProps {
  customProps: {
    app: {
      sourcePath: string;
    };
    domains: string | Domain[];

    cloudFront: {
      certificateArn: string;
      disableCache?: boolean;
      viewerRequestFunction: {
        inFile: string;
        outFile: string;
      };
    };

    mongoDb: Omit<StateMongoDBProps, 'role'>;

    api: {
      httpUrl: string;
      webSocketUrl: string;
    };

    lambda: LambdaHandlersProps;
  };
}

export class NotesStack extends Stack {
  constructor(scope: Construct, id: string, props: NotesStackProps) {
    super(scope, id, props);
    const customProps = props.customProps;

    // Lambda handlers
    const handlers = new LambdaHandlers(this, 'LambdaHandlers', customProps.lambda);

    // DynamoDB
    const webSocketDynamoDB = new WebSocketDynamoDB(this, 'WebSocketDynamo');
    handlers.getAll().forEach((lambda) => {
      lambda.addEnvironment(
        'DYNAMODB_CONNECTIONS_TABLE_NAME',
        webSocketDynamoDB.tables.connections.tableName
      );
      lambda.addEnvironment(
        'DYNAMODB_SUBSCRIPTIONS_TABLE_NAME',
        webSocketDynamoDB.tables.subscriptions.tableName
      );
    });
    webSocketDynamoDB.tables.connections.grantReadData(handlers.http);
    webSocketDynamoDB.tables.subscriptions.grantReadData(handlers.http);
    webSocketDynamoDB.tables.connections.grantReadWriteData(handlers.webSocket);
    webSocketDynamoDB.tables.subscriptions.grantReadWriteData(handlers.webSocket);

    // MongoDB
    const mongoDbRole = new Role(this, 'MongoDBAtlasAuthRole', {
      assumedBy: new CompositePrincipal(
        ...handlers.getAll().map((lambda) => lambda.grantPrincipal)
      ),
    });
    const mongoDb = new StateMongoDB(this, 'MongoDB', {
      role: mongoDbRole,
      atlas: customProps.mongoDb.atlas,
    });
    handlers.getAll().forEach((lambda) => {
      lambda.addEnvironment('MONGODB_ATLAS_ROLE_ARN', mongoDbRole.roleArn);
      lambda.addEnvironment('MONGODB_ATLAS_URI_SRV', mongoDb.connectionString);
    });

    // Rest API
    const restApi = new HttpRestApi(this, 'RestApi', {
      url: customProps.api.httpUrl,
      handler: handlers.http,
    });

    // WebSocket API
    const webSocketApi = new SubscriptionsWebSocketApi(this, 'WebSocketApi', {
      url: customProps.api.webSocketUrl,
      handler: handlers.webSocket,
    });
    handlers.getAll().forEach((lambda) => {
      webSocketApi.stage.grantManagementApiAccess(lambda);
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
            function: new Function(this, 'ViewerRequestFn', {
              code: FunctionCode.fromFile({
                filePath: (() => {
                  const options: TranspileOptionsAsFile = {
                    inFile: customProps.cloudFront.viewerRequestFunction.inFile,
                    outFile: customProps.cloudFront.viewerRequestFunction.outFile,
                    transpile: {
                      compilerOptions: {
                        target: ScriptTarget.ES5,
                        module: ModuleKind.CommonJS,
                      },
                    },
                    source: {
                      replace: {
                        'process.env.PRIMARY_DOMAIN': domains[0].primaryName,
                        'export const exportedForTesting_handler = handler;': '',
                      },
                    },
                  };

                  transpileTypeScriptToFile(options);
                  eslintFile(options.outFile);

                  return options.outFile;
                })(),
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
        [webSocketApi.url.pathname]: {
          origin: new HttpOrigin(
            Fn.select(1, Fn.split('//', webSocketApi.api.apiEndpoint))
          ),
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
      value: mongoDb.atlas.mProject.props.name,
    });
    new CfnOutput(this, 'MongoDbAtlasClusterName', {
      value: mongoDb.atlas.mCluster.props.name,
    });
    new CfnOutput(this, 'MongoDbAtlasConnectionString', {
      value: mongoDb.connectionString,
    });
    new CfnOutput(this, 'WebSocketUrl', {
      value: webSocketApi.stage.url,
    });
  }
}
