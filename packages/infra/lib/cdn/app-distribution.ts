import { Duration, Fn } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  ResponseHeadersPolicy,
  HeadersReferrerPolicy,
  HeadersFrameOption,
  Distribution,
  PriceClass,
  AllowedMethods,
  ViewerProtocolPolicy,
  OriginRequestPolicy,
  CachePolicy,
  CacheHeaderBehavior,
  CacheQueryStringBehavior,
  CacheCookieBehavior,
  FunctionEventType,
  FunctionCode,
  OriginRequestCookieBehavior,
  OriginRequestHeaderBehavior,
  OriginRequestQueryStringBehavior,
  Function,
} from 'aws-cdk-lib/aws-cloudfront';
import {
  RestApiOrigin,
  HttpOrigin,
  S3BucketOrigin,
} from 'aws-cdk-lib/aws-cloudfront-origins';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { ScriptTarget, ModuleKind } from 'typescript';

import { HttpRestApi } from '../api/http-rest-api';
import { SubscriptionsWebSocketApi } from '../api/subscriptions-websocket-api';
import { Domains } from '../dns/domains';
import {
  TranspileOptionsAsFile,
  transpileTypeScriptToFile,
  eslintFile,
} from '../utils/transpile-ts';

export interface AppDistributionProps {
  certificateArn: string;
  domains: Domains;
  defaultOriginFiles: IBucket;
  restApi: HttpRestApi;
  webSocketApi: SubscriptionsWebSocketApi;
  viewerRequestFunction: {
    inFile: string;
    outFile: string;
  };
  disableCache?: boolean;
}

export class AppDistribution extends Construct {
  readonly distribution;

  constructor(scope: Construct, id: string, props: AppDistributionProps) {
    super(scope, id);

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

    this.distribution = new Distribution(this, 'Distribution', {
      comment: 'CDN for Notes App with GraphQL API',
      priceClass: PriceClass.PRICE_CLASS_100,
      certificate: Certificate.fromCertificateArn(
        this,
        'MyCloudFrontCertificate',
        props.certificateArn
      ),
      domainNames: props.domains.definitions
        .map((d) => [d.primaryName, ...d.aliases])
        .flat(),
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(props.defaultOriginFiles),
        compress: true,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy,
        cachePolicy: props.disableCache
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
                    inFile: props.viewerRequestFunction.inFile,
                    outFile: props.viewerRequestFunction.outFile,
                    transpile: {
                      compilerOptions: {
                        target: ScriptTarget.ES5,
                        module: ModuleKind.CommonJS,
                      },
                    },
                    source: {
                      replace: {
                        'process.env.PRIMARY_DOMAIN': props.domains.getPrimaryDomain(),
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
        [props.restApi.url.pathname]: {
          origin: new RestApiOrigin(props.restApi.api),
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
          compress: true,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          responseHeadersPolicy,
        },
        [props.webSocketApi.url.pathname]: {
          origin: new HttpOrigin(
            Fn.select(1, Fn.split('//', props.webSocketApi.api.apiEndpoint))
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
  }
}
