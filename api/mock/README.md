# Mocks for development and testing

## [graphql-lambda](./graphql-lambda/)

Express server that mocks AWS API Gateway and executes GraphQL lambda handlers [apolloHttpRequestHandler.ts](../src/api/apolloHttpRequestHandler.ts) and [webSocketSubscriptionHandler.ts](../src/api/webSocketSubscriptionHandler.ts)

Endpoints are defined in environment variables `NEXT_PUBLIC_GRAPHQL_HTTP_URL` and `NEXT_PUBLIC_GRAPHQL_WS_URL`.
Ports must match on both URLs. Environment variables can be loaded from [.env.local](../.env.local).
For example:

```
NEXT_PUBLIC_GRAPHQL_HTTP_URL=http://127.0.0.1:4000/graphql
NEXT_PUBLIC_GRAPHQL_WS_URL=ws://127.0.0.1:4000/graphql
```

## [graphql-server](./graphql-lambda/)

Express server that executes GraphQL requests using following packages:

- `@apollo/server`
- `graphql-ws`
- `graphql-subscriptions`

`graphql-ws` and `graphql-subscriptions` rely on stateful server and cannot be used to execute lambda handlers. This server is only used for comparing against [graphql-lambda](./graphql-lambda/).

Endpoints are defined in environment variables `NEXT_PUBLIC_GRAPHQL_HTTP_URL` and `NEXT_PUBLIC_GRAPHQL_WS_URL`.
Ports must match on both URLs. Environment variables can be loaded from [.env.local](../.env.local).
For example:

```
NEXT_PUBLIC_GRAPHQL_HTTP_URL=http://127.0.0.1:4000/graphql
NEXT_PUBLIC_GRAPHQL_WS_URL=ws://127.0.0.1:4000/graphql
```

## [dynamodb](./dynamodb/)

Docker image `amazon/dynamodb-local` is used to mock DynamoDB.  
Endpoint: `http://127.0.0.1:8000`.

## [mongodb](./mongodb/)

Docker image `mongo` is used to mock MongoDB.  
URI: `mongodb://root:example@127.0.0.1:27017/mongo?authSource=admin`

# Accessing GraphQL on terminal

### HTTP request

```bash
$ curl -X POST http://127.0.0.1:4000/graphql -H 'Content-Type: application/json' -d '{"query":"{items{id name done}}"}'
```

### WebSocket

```bash
$ wscat -s graphql-transport-ws -c ws://127.0.0.1:4000/graphql
> {"type":"connection_init"}
> {"id":"randomid","type":"subscribe","payload":{"operationName":"OnItemAdded", "query":"subscription OnItemAdded {itemCreated {id name done}}"}}
```
