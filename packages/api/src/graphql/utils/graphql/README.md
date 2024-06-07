# GraphQL

Code is copied from 
[graphql@16.8.1](https://github.com/graphql/graphql-js/tree/v16.8.1)

All credits go to graphql package collaborators.

## Reason
Used for calling executeField in preExecuteField.   
Need it to look ahead of the operation to know how many items will be returned in a list.

## Changes

Added property `options` ExecutionContext.

### ExecutionOptions
- `bubbleNull`: if true then ignores "non-nullable field on null error" and null bubbles to nearest parent.