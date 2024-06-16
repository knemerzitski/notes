import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CompositePrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { HttpRestApi } from '../api/http-rest-api';
import { LambdaHandlers, LambdaHandlersProps } from '../compute/lambda-handlers';
import { WebSocketDynamoDB } from '../database/websocket-dynamodb';
import { StateMongoDB, StateMongoDBProps } from '../database/state-mongodb';
import { SubscriptionsWebSocketApi } from '../api/subscriptions-websocket-api';
import { Domains, DomainsProps } from '../dns/domains';
import { AppDistribution, AppDistributionProps } from '../cdn/AppDistribution';
import { AppStaticFiles } from '../storage/app-static-files';
import {
  PostDeploymentFunction,
  PostDeploymentFunctionProps,
} from '../compute/post-deployment-function';

export interface NotesStackProps extends StackProps {
  customProps: {
    postDeployment: PostDeploymentFunctionProps;
    lambda: LambdaHandlersProps;
    mongoDb: Omit<StateMongoDBProps, 'role'>;
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

    // Lambda handlers
    const handlers = new LambdaHandlers(this, 'LambdaHandlers', customProps.lambda);
    const postDeployHandler = new PostDeploymentFunction(
      this,
      'PostDeployment',
      customProps.postDeployment
    );
    const mongoDbHandlers = [...handlers.getAll(), postDeployHandler.function];

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
        ...mongoDbHandlers.map((lambda) => lambda.grantPrincipal)
      ),
    });
    const mongoDb = new StateMongoDB(this, 'MongoDB', {
      role: mongoDbRole,
      atlas: customProps.mongoDb.atlas,
    });
    mongoDbHandlers.forEach((lambda) => {
      lambda.addEnvironment(
        'MONGODB_ATLAS_DATABASE_NAME',
        customProps.mongoDb.atlas.databaseName
      );
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
      value: mongoDb.atlas.mProject.props.name,
    });
    new CfnOutput(this, 'MongoDBAtlasClusterName', {
      value: mongoDb.atlas.mCluster.props.name,
    });
    new CfnOutput(this, 'MongoDBAtlasConnectionString', {
      value: mongoDb.connectionString,
    });
    new CfnOutput(this, 'WebSocketUrl', {
      value: webSocketApi.stage.url,
    });
  }
}
