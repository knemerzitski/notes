import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import {
  BucketDeployment,
  BucketDeploymentProps,
  CacheControl,
  Source,
} from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export interface BucketDeploymentOptions {
  sourcePath: string;
  /**
   * Invalidates distribution cache
   */
  distribution?: Distribution;
}

export class AppStaticFiles extends Construct {
  readonly bucket: Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.bucket = new Bucket(this, 'Bucket', {
      versioned: false,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  }

  addDeployment(options: BucketDeploymentOptions) {
    const commonProps: BucketDeploymentProps = {
      logRetention: RetentionDays.ONE_DAY,
      sources: [Source.asset(options.sourcePath)],
      destinationBucket: this.bucket,
      cacheControl: [
        CacheControl.setPublic(),
        CacheControl.maxAge(Duration.seconds(31536000)),
        CacheControl.immutable(),
      ],
    };

    new BucketDeployment(this, 'AllExceptWebp', {
      ...commonProps,
      exclude: ['*.webp'],
      ...(options.distribution && {
        distribution: options.distribution,
        distributionPaths: ['/*'],
      }),
    });

    new BucketDeployment(this, 'OnlyWebp', {
      ...commonProps,
      exclude: ['*'],
      include: ['*.webp'],
      contentType: 'image/webp',
    });
  }
}
