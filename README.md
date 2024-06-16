# Notes
A single page note keeping app with collaborative editing capabilities powered by AWS Lambda.

- Front-end: React web app with [Apollo Client](https://www.apollographql.com/docs/react/), [Material UI](https://mui.com/)
- Back-end: GraphQL API with [Apollo Server](https://www.apollographql.com/docs/apollo-server), [MongoDB](https://www.mongodb.com/)

# Getting Started

[Docker](https://www.docker.com/) must be running to create local database containers.

1. Install dependencies `npm install`
2. Run in development mode `npm run dev`
3. Open in browser `http://localhost:5173`

# Motivation
I wanted to develop a robust app that I would use myself. Since I take notes
daily to help organize my life, I thought it would be a fun and motivating topic to work on.

I could just keep using an already existing app like Google Keep. Implementing collaborative
editing is reinventing the wheel since there are libraries I could use. But then I wouldn't 
learn as much and I wanted to have a technical challenge. When starting this project
I had no idea what I was getting myself into and it has taken me much longer that expected
but it's been worth given all what I've learned.

# Architecture
I chose serverless specifically because I want to keep the app running and I don't expect
it to have high demand since it's mostly my portfolio project. It made no sense
to pay for a server.

I'm experienced with relational databases. I wanted to know how
non-relational databases work, so I chose MongoDB. It has good integration with
AWS services and plenty of resources.

Architecture diagram
![Architecture overview](packages/infra/docs/architecture-overview.png)

# Packages Overview

## collab
Contains the building blocks for collaborative editing.  
Operational transformations are implemented based on [easysync-full-description](https://github.com/ether/etherpad-lite/blob/v2.1.0/doc/public/easysync/easysync-full-description.pdf).

## api
API Logic is implemented in GraphQL resolvers. Contains MongoDB schemas. Uses DataLoader for
deduplication.

## lambda-graphql
Contains core Lambda handlers functionality for supporting GraphQL API.  
- Handler containing Apollo Server for handling HTTP requests 
- Handler containing logic for handling GraphQL subscriptions from API Gateway WebSocket connections.  
Subscriptions state is stored in DynamoDB tables.

Initial code is based on project [Graphql Lambda Subscriptions](https://github.com/reconbot/graphql-lambda-subscriptions).

## app
TODO write docs 

- Supports multiple accounts
- Note sharing via links
- Local only notes
- Google sign in

## infra
Contains AWS CDK code which is deployed as CloudFormation template.

## api-dev-server
API development server is an adapter between a stateful server and Lambda handlers.
It transforms HTTP requests/responses into appropriate shapes.
Uses packages `express`, `http` and `ws`.

This makes development much quicker than using something like AWS `sam local start-api`, which
doesn't support WebSockets.

# Tests
TODO write docs

# Deploying
TODO write docs 

[AWS CLI](https://aws.amazon.com/cli/) must be installed and properly set up with an account.

# Stack
- Typescript
- React
- Vite
- React Material UI
- Docker
- Apollo GraphQL
- AWS Lambda
- MongoDB
- DynamoDB

# License
Notes is [MIT-licensed](LICENSE).
