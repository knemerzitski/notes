import { DocumentNode } from '@apollo/client';
import { DocumentTransform } from '@apollo/client/utilities';
import {
  ArgumentNode,
  DirectiveNode,
  FieldNode,
  Kind,
  ObjectFieldNode,
  ObjectValueNode,
  visit,
} from 'graphql/index.js';

import { isDefined } from '~utils/type-guards/is-defined';

interface RemoveArgumentsInfo {
  path: string[];
}

interface FieldInfo {
  field: FieldNode;
  removeDirectives: DirectiveNode[];
  removeArguments: RemoveArgumentsInfo[];
}

interface ClientArgsTransformOptions {
  readonly directiveName: string;
  readonly argumentName: string;
  /**
   * Remove variables that are used in arguments
   * @default false
   */
  readonly keepVariables?: boolean;
}

interface Context {
  checkUnusedVariables: string[];
}

export class ClientArgsTransform {
  private readonly documentTransform;
  constructor(options: ClientArgsTransformOptions) {
    const { directiveName, argumentName, keepVariables = false } = options;

    this.documentTransform = new DocumentTransform((document) => {
      const fieldStack: FieldInfo[] = [];
      function getCurrentFieldInfo() {
        const current = fieldStack[fieldStack.length - 1];
        if (!current) {
          throw new Error('Unexpected no field stack');
        }
        return current;
      }

      const ctx: Context = {
        checkUnusedVariables: [],
      };

      const transformedDocument = visit(document, {
        Field: {
          enter(node) {
            fieldStack.push({
              field: node,
              removeDirectives: [],
              removeArguments: [],
            });
          },
          leave(node) {
            const fieldInfo = fieldStack.pop();
            if (!fieldInfo) {
              return;
            }

            if (
              fieldInfo.removeArguments.length === 0 &&
              fieldInfo.removeDirectives.length === 0
            ) {
              return;
            }

            return {
              ...node,
              arguments: removeArguments(
                node.arguments,
                fieldInfo.removeArguments,
                ctx,
                options
              ),
              directives: removeDirectives(node.directives, fieldInfo.removeDirectives),
            };
          },
        },
        Directive: {
          enter(node) {
            if (node.name.value !== directiveName) {
              return false;
            }

            const fieldInfo = getCurrentFieldInfo();
            fieldInfo.removeDirectives.push(node);
            return;
          },
        },
        Argument: {
          enter(node) {
            const fieldInfo = getCurrentFieldInfo();
            if (
              fieldInfo.removeDirectives.length === 0 ||
              node.name.value !== argumentName
            ) {
              return false;
            }

            return;
          },
        },
        StringValue: {
          enter(node) {
            const fieldInfo = getCurrentFieldInfo();
            if (fieldInfo.removeDirectives.length === 0) {
              return false;
            }

            fieldInfo.removeArguments.push({
              path: node.value.split('.'),
            });

            return;
          },
        },
      });

      // Remove potentially unused variables
      if (!keepVariables && ctx.checkUnusedVariables.length > 0) {
        const removeVariables = [...ctx.checkUnusedVariables];
        return visit(transformedDocument, {
          VariableDefinition: {
            enter(node) {
              if (removeVariables.includes(node.variable.name.value)) {
                return null;
              }
              return false;
            },
          },
        });
      }

      return transformedDocument;
    });
  }

  transform(document: DocumentNode) {
    return this.documentTransform.transformDocument(document);
  }
}

function removeArguments(
  nodes: readonly ArgumentNode[] | undefined,
  inputs: RemoveArgumentsInfo[],
  ctx: Context,
  {
    directiveName,
    argumentName,
  }: Pick<ClientArgsTransformOptions, 'directiveName' | 'argumentName'>
): readonly ArgumentNode[] | undefined {
  if (!nodes) {
    return nodes;
  }

  const unprocessedInputs = [...inputs];
  const resultNodes = nodes
    .map((node) => {
      for (let i = 0; i < unprocessedInputs.length; i++) {
        const input = unprocessedInputs[i];
        if (!input) {
          continue;
        }

        const modifiedNode = removeArgument(node, input, ctx);
        if (node !== modifiedNode) {
          // Input modified argument
          unprocessedInputs.splice(i, 1);
          return modifiedNode;
        }
      }

      return node;
    })
    .filter(isDefined);

  const unprocessedInput = unprocessedInputs[0];
  if (unprocessedInput) {
    throw new Error(
      `Directive @${directiveName} argument "${argumentName}" value "${unprocessedInput.path.join('.')}" does not match any arguments`
    );
  }

  return resultNodes;
}

function removeArgument(
  node: ArgumentNode,
  input: RemoveArgumentsInfo,
  ctx: Context
): ArgumentNode | undefined {
  const target = input.path[0];
  if (node.name.value !== target) {
    // Return same argument
    return node;
  }

  // Remove this node
  if (input.path.length === 1) {
    return;
  }

  if (node.value.kind === Kind.OBJECT) {
    const modifiedValue = removeObjectValue(
      node.value,
      {
        ...input,
        path: input.path.slice(1),
      },
      ctx
    );
    if (modifiedValue !== node.value) {
      // Remove object
      if (modifiedValue == null) {
        return;
      }

      // Modify object
      return {
        ...node,
        value: modifiedValue,
      };
    }
  }

  // Return same argument
  return node;
}

function removeObjectValue(
  node: ObjectValueNode,
  input: RemoveArgumentsInfo,
  ctx: Context
): ObjectValueNode | undefined {
  const targetName = input.path[0];
  if (!targetName) {
    // No target, delete object
    return;
  }

  const targetField = node.fields.find((field) => field.name.value === targetName);
  if (!targetField) {
    // Not field in object, leave unmodified
    return node;
  }

  const modifedField = removeObjectField(targetField, input, ctx);
  if (modifedField !== targetField) {
    if (modifedField == null) {
      const fields = node.fields.filter((field) => field !== targetField);
      if (fields.length === 0) {
        // Remove empty object
        return;
      } else {
        // Remove field
        return {
          ...node,
          fields,
        };
      }
    } else {
      return {
        ...node,
        fields: node.fields.map((field) =>
          field === targetField ? modifedField : field
        ),
      };
    }
  }

  return node;
}

function removeObjectField(
  node: ObjectFieldNode,
  input: RemoveArgumentsInfo,
  ctx: Context
): ObjectFieldNode | undefined {
  const targetName = input.path[0];
  if (node.name.value !== targetName) {
    // Return same field
    return node;
  }

  // Remove this field
  if (input.path.length === 1) {
    if (node.value.kind === Kind.VARIABLE) {
      // Remember that variable might be unused
      ctx.checkUnusedVariables.push(node.name.value);
    }

    return;
  }

  if (node.value.kind === Kind.OBJECT) {
    const modifiedValue = removeObjectValue(
      node.value,
      {
        ...input,
        path: input.path.slice(1),
      },
      ctx
    );
    if (modifiedValue !== node.value) {
      if (modifiedValue == null) {
        return;
      } else {
        return {
          ...node,
          value: modifiedValue,
        };
      }
    }
  }

  return node;
}

function removeDirectives(
  sourceNodes: readonly DirectiveNode[] | undefined,
  removeNodes: DirectiveNode[]
): readonly DirectiveNode[] | undefined {
  return sourceNodes?.filter((node) => !removeNodes.includes(node));
}
