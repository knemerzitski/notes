import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { CompositePrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

import { HttpRestApi } from '../api/http-rest-api';
import { SubscriptionsWebSocketApi } from '../api/subscriptions-websocket-api';
import { AppDistribution, AppDistributionProps } from '../cdn/app-distribution';
import { LambdaHandlers, LambdaHandlersProps } from '../compute/lambda-handlers';
import {
  PostDeploymentFunction,
  PostDeploymentFunctionProps,
} from '../compute/post-deployment-function';
import { ScheduledFunction, ScheduledFunctionProps } from '../compute/scheduled-handler';
import { StateMongoDB, StateMongoDBProps } from '../database/state-mongodb';
import { WebSocketDynamoDB } from '../database/websocket-dynamodb';
import { Domains, DomainsProps } from '../dns/domains';
import { AppStaticFiles } from '../storage/app-static-files';

export interface NotesStackProps extends StackProps {
  customProps: {
    postDeployment: PostDeploymentFunctionProps;
    scheduled: ScheduledFunctionProps;
    lambda: LambdaHandlersProps;
    mongoDB: Omit<StateMongoDBProps, 'role'>;
    api: {
      httpUrl: string;
      webSocketUrl: string;
    };
    domain: DomainsProps;

    distribution: Omit<
      AppDistributionProps,
      'defaultOriginFiles' | 'restApi' | 'webSocketApi' | 'domains'
    >;
    app: {
      outPath: string;
    };
  };
}

export class NotesStack extends Stack {
  constructor(scope: Construct, id: string, props: NotesStackProps) {
    super(scope, id, props);
    const customProps = props.customProps;

    const mongoDBHandlers: NodejsFunction[] = [];

    // Lambda handlers
    const handlers = new LambdaHandlers(this, 'LambdaHandlers', customProps.lambda);
    mongoDBHandlers.push(...handlers.getAll());

    const postDeployHandler = new PostDeploymentFunction(
      this,
      'PostDeployment',
      customProps.postDeployment
    );
    mongoDBHandlers.push(postDeployHandler.function);

    const scheduledHandler = new ScheduledFunction(
      this,
      'Scheduled',
      customProps.scheduled
    );
    mongoDBHandlers.push(scheduledHandler.function);

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
      lambda.addEnvironment(
        'DYNAMODB_COMPLETED_SUBSCRIPTIONS_TABLE_NAME',
        webSocketDynamoDB.tables.completedSubscriptions.tableName
      );
    });
    webSocketDynamoDB.tables.connections.grantReadData(handlers.http);
    webSocketDynamoDB.tables.connections.grantReadWriteData(handlers.webSocket);
    webSocketDynamoDB.tables.subscriptions.grantReadData(handlers.http);
    webSocketDynamoDB.tables.subscriptions.grantReadWriteData(handlers.webSocket);
    webSocketDynamoDB.tables.completedSubscriptions.grantReadData(handlers.http);
    webSocketDynamoDB.tables.completedSubscriptions.grantReadWriteData(
      handlers.webSocket
    );

    // MongoDB
    const mongoDBRole = new Role(this, 'MongoDBAtlasAuthRole', {
      assumedBy: new CompositePrincipal(
        ...mongoDBHandlers.map((lambda) => lambda.grantPrincipal)
      ),
    });
    const mongoDB = new StateMongoDB(this, 'MongoDB', {
      role: mongoDBRole,
      atlas: customProps.mongoDB.atlas,
    });
    mongoDBHandlers.forEach((lambda) => {
      lambda.addEnvironment(
        'MONGODB_ATLAS_DATABASE_NAME',
        customProps.mongoDB.atlas.databaseName
      );
      lambda.addEnvironment('MONGODB_ATLAS_ROLE_ARN', mongoDBRole.roleArn);
      lambda.addEnvironment('MONGODB_ATLAS_URI_SRV', mongoDB.connectionString);
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

    const staticFiles = new AppStaticFiles(this, 'StaticFiles');

    // DNS
    const domains = new Domains(this, 'Domains', customProps.domain);

    // CloudFront
    const appDistribution = new AppDistribution(this, 'AppDistribution', {
      ...props.customProps.distribution,
      domains,
      defaultOriginFiles: staticFiles.bucket,
      restApi,
      webSocketApi,
    });
    // Make CloudFront accessible through a domain
    domains.addDistributionTaret(appDistribution.distribution);

    // Deploy App static files
    staticFiles.addDeployment({
      sourcePath: customProps.app.outPath,
      distribution:
        customProps.distribution.disableCache !== true
          ? appDistribution.distribution
          : undefined,
    });

    new CfnOutput(this, 'DistributionDomainName', {
      value: appDistribution.distribution.domainName,
    });
    new CfnOutput(this, 'MongoDBAtlasProjectName', {
      value: mongoDB.atlas.mProject.props.name,
    });
    new CfnOutput(this, 'MongoDBAtlasClusterName', {
      value: mongoDB.atlas.mCluster.props.name,
    });
    new CfnOutput(this, 'MongoDBAtlasConnectionString', {
      value: mongoDB.connectionString,
    });
    new CfnOutput(this, 'WebSocketUrl', {
      value: webSocketApi.stage.url,
    });
  }
}
