import type { DocumentNode } from 'graphql';
export const typeDefs = {
  kind: 'Document',
  definitions: [
    {
      kind: 'ObjectTypeDefinition',
      name: { kind: 'Name', value: 'Query', loc: { start: 5, end: 10 } },
      interfaces: [],
      directives: [],
      fields: [],
      loc: { start: 0, end: 10 },
    },
    {
      kind: 'ObjectTypeDefinition',
      name: { kind: 'Name', value: 'Mutation', loc: { start: 17, end: 25 } },
      interfaces: [],
      directives: [],
      fields: [],
      loc: { start: 12, end: 25 },
    },
    {
      kind: 'ObjectTypeDefinition',
      name: { kind: 'Name', value: 'Subscription', loc: { start: 32, end: 44 } },
      interfaces: [],
      directives: [],
      fields: [],
      loc: { start: 27, end: 44 },
    },
    {
      kind: 'DirectiveDefinition',
      description: {
        kind: 'StringValue',
        value: 'Requires user to be authenticated and with access to specific role',
        block: false,
        loc: { start: 46, end: 114 },
      },
      name: { kind: 'Name', value: 'auth', loc: { start: 126, end: 130 } },
      arguments: [
        {
          kind: 'InputValueDefinition',
          name: { kind: 'Name', value: 'requires', loc: { start: 131, end: 139 } },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'Role', loc: { start: 141, end: 145 } },
            loc: { start: 141, end: 145 },
          },
          defaultValue: {
            kind: 'EnumValue',
            value: 'USER',
            loc: { start: 148, end: 152 },
          },
          directives: [],
          loc: { start: 131, end: 152 },
        },
      ],
      repeatable: false,
      locations: [
        { kind: 'Name', value: 'OBJECT', loc: { start: 157, end: 163 } },
        { kind: 'Name', value: 'FIELD_DEFINITION', loc: { start: 166, end: 182 } },
      ],
      loc: { start: 46, end: 182 },
    },
    {
      kind: 'EnumTypeDefinition',
      name: { kind: 'Name', value: 'Role', loc: { start: 189, end: 193 } },
      directives: [],
      values: [
        {
          kind: 'EnumValueDefinition',
          name: { kind: 'Name', value: 'USER', loc: { start: 198, end: 202 } },
          directives: [],
          loc: { start: 198, end: 202 },
        },
      ],
      loc: { start: 184, end: 204 },
    },
    {
      kind: 'ObjectTypeDefinition',
      name: { kind: 'Name', value: 'Note', loc: { start: 210, end: 214 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'Note unique ID',
            block: false,
            loc: { start: 219, end: 235 },
          },
          name: { kind: 'Name', value: 'id', loc: { start: 238, end: 240 } },
          arguments: [],
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'ID', loc: { start: 242, end: 244 } },
              loc: { start: 242, end: 244 },
            },
            loc: { start: 242, end: 245 },
          },
          directives: [],
          loc: { start: 219, end: 245 },
        },
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'User who owns this note',
            block: false,
            loc: { start: 248, end: 273 },
          },
          name: { kind: 'Name', value: 'userId', loc: { start: 276, end: 282 } },
          arguments: [],
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'ID', loc: { start: 284, end: 286 } },
              loc: { start: 284, end: 286 },
            },
            loc: { start: 284, end: 287 },
          },
          directives: [],
          loc: { start: 248, end: 287 },
        },
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'Note title',
            block: false,
            loc: { start: 290, end: 302 },
          },
          name: { kind: 'Name', value: 'title', loc: { start: 305, end: 310 } },
          arguments: [],
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String', loc: { start: 312, end: 318 } },
              loc: { start: 312, end: 318 },
            },
            loc: { start: 312, end: 319 },
          },
          directives: [],
          loc: { start: 290, end: 319 },
        },
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'Note text contents',
            block: false,
            loc: { start: 322, end: 342 },
          },
          name: { kind: 'Name', value: 'content', loc: { start: 345, end: 352 } },
          arguments: [],
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String', loc: { start: 354, end: 360 } },
              loc: { start: 354, end: 360 },
            },
            loc: { start: 354, end: 361 },
          },
          directives: [],
          loc: { start: 322, end: 361 },
        },
      ],
      loc: { start: 205, end: 363 },
    },
    {
      kind: 'InputObjectTypeDefinition',
      name: { kind: 'Name', value: 'CreateNoteInput', loc: { start: 371, end: 386 } },
      directives: [],
      fields: [
        {
          kind: 'InputValueDefinition',
          name: { kind: 'Name', value: 'title', loc: { start: 391, end: 396 } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String', loc: { start: 398, end: 404 } },
              loc: { start: 398, end: 404 },
            },
            loc: { start: 398, end: 405 },
          },
          directives: [],
          loc: { start: 391, end: 405 },
        },
        {
          kind: 'InputValueDefinition',
          name: { kind: 'Name', value: 'content', loc: { start: 408, end: 415 } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String', loc: { start: 417, end: 423 } },
              loc: { start: 417, end: 423 },
            },
            loc: { start: 417, end: 424 },
          },
          directives: [],
          loc: { start: 408, end: 424 },
        },
      ],
      loc: { start: 365, end: 426 },
    },
    {
      kind: 'InputObjectTypeDefinition',
      name: { kind: 'Name', value: 'UpdateNoteInput', loc: { start: 434, end: 449 } },
      directives: [],
      fields: [
        {
          kind: 'InputValueDefinition',
          name: { kind: 'Name', value: 'id', loc: { start: 454, end: 456 } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'ID', loc: { start: 458, end: 460 } },
              loc: { start: 458, end: 460 },
            },
            loc: { start: 458, end: 461 },
          },
          directives: [],
          loc: { start: 454, end: 461 },
        },
        {
          kind: 'InputValueDefinition',
          name: { kind: 'Name', value: 'title', loc: { start: 464, end: 469 } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String', loc: { start: 471, end: 477 } },
              loc: { start: 471, end: 477 },
            },
            loc: { start: 471, end: 478 },
          },
          directives: [],
          loc: { start: 464, end: 478 },
        },
        {
          kind: 'InputValueDefinition',
          name: { kind: 'Name', value: 'content', loc: { start: 481, end: 488 } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String', loc: { start: 490, end: 496 } },
              loc: { start: 490, end: 496 },
            },
            loc: { start: 490, end: 497 },
          },
          directives: [],
          loc: { start: 481, end: 497 },
        },
      ],
      loc: { start: 428, end: 499 },
    },
    {
      kind: 'ObjectTypeExtension',
      name: { kind: 'Name', value: 'Query', loc: { start: 513, end: 518 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'Get all notes belonging to a user of active session',
            block: false,
            loc: { start: 523, end: 576 },
          },
          name: { kind: 'Name', value: 'notes', loc: { start: 579, end: 584 } },
          arguments: [],
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: {
                kind: 'NamedType',
                name: { kind: 'Name', value: 'Note', loc: { start: 587, end: 591 } },
                loc: { start: 587, end: 591 },
              },
              loc: { start: 587, end: 592 },
            },
            loc: { start: 586, end: 593 },
          },
          directives: [
            {
              kind: 'Directive',
              name: { kind: 'Name', value: 'auth', loc: { start: 595, end: 599 } },
              arguments: [],
              loc: { start: 594, end: 599 },
            },
          ],
          loc: { start: 523, end: 599 },
        },
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'Get note by ID belonging to a user of active session',
            block: false,
            loc: { start: 602, end: 656 },
          },
          name: { kind: 'Name', value: 'note', loc: { start: 659, end: 663 } },
          arguments: [
            {
              kind: 'InputValueDefinition',
              name: { kind: 'Name', value: 'id', loc: { start: 664, end: 666 } },
              type: {
                kind: 'NonNullType',
                type: {
                  kind: 'NamedType',
                  name: { kind: 'Name', value: 'String', loc: { start: 668, end: 674 } },
                  loc: { start: 668, end: 674 },
                },
                loc: { start: 668, end: 675 },
              },
              directives: [],
              loc: { start: 664, end: 675 },
            },
          ],
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'Note', loc: { start: 678, end: 682 } },
            loc: { start: 678, end: 682 },
          },
          directives: [
            {
              kind: 'Directive',
              name: { kind: 'Name', value: 'auth', loc: { start: 684, end: 688 } },
              arguments: [],
              loc: { start: 683, end: 688 },
            },
          ],
          loc: { start: 602, end: 688 },
        },
      ],
      loc: { start: 501, end: 690 },
    },
    {
      kind: 'ObjectTypeExtension',
      name: { kind: 'Name', value: 'Mutation', loc: { start: 704, end: 712 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'Create a new note belonging to a user of active session',
            block: false,
            loc: { start: 717, end: 774 },
          },
          name: { kind: 'Name', value: 'createNote', loc: { start: 777, end: 787 } },
          arguments: [
            {
              kind: 'InputValueDefinition',
              name: { kind: 'Name', value: 'input', loc: { start: 788, end: 793 } },
              type: {
                kind: 'NonNullType',
                type: {
                  kind: 'NamedType',
                  name: {
                    kind: 'Name',
                    value: 'CreateNoteInput',
                    loc: { start: 795, end: 810 },
                  },
                  loc: { start: 795, end: 810 },
                },
                loc: { start: 795, end: 811 },
              },
              directives: [],
              loc: { start: 788, end: 811 },
            },
          ],
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'Note', loc: { start: 814, end: 818 } },
            loc: { start: 814, end: 818 },
          },
          directives: [
            {
              kind: 'Directive',
              name: { kind: 'Name', value: 'auth', loc: { start: 820, end: 824 } },
              arguments: [],
              loc: { start: 819, end: 824 },
            },
          ],
          loc: { start: 717, end: 824 },
        },
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'Update note by ID belonging to a user of active session',
            block: false,
            loc: { start: 827, end: 884 },
          },
          name: { kind: 'Name', value: 'updateNote', loc: { start: 887, end: 897 } },
          arguments: [
            {
              kind: 'InputValueDefinition',
              name: { kind: 'Name', value: 'input', loc: { start: 898, end: 903 } },
              type: {
                kind: 'NonNullType',
                type: {
                  kind: 'NamedType',
                  name: {
                    kind: 'Name',
                    value: 'UpdateNoteInput',
                    loc: { start: 905, end: 920 },
                  },
                  loc: { start: 905, end: 920 },
                },
                loc: { start: 905, end: 921 },
              },
              directives: [],
              loc: { start: 898, end: 921 },
            },
          ],
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'Boolean', loc: { start: 924, end: 931 } },
              loc: { start: 924, end: 931 },
            },
            loc: { start: 924, end: 932 },
          },
          directives: [
            {
              kind: 'Directive',
              name: { kind: 'Name', value: 'auth', loc: { start: 934, end: 938 } },
              arguments: [],
              loc: { start: 933, end: 938 },
            },
          ],
          loc: { start: 827, end: 938 },
        },
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'Delete note by ID belonging to a user of active session',
            block: false,
            loc: { start: 941, end: 998 },
          },
          name: { kind: 'Name', value: 'deleteNote', loc: { start: 1001, end: 1011 } },
          arguments: [
            {
              kind: 'InputValueDefinition',
              name: { kind: 'Name', value: 'id', loc: { start: 1012, end: 1014 } },
              type: {
                kind: 'NonNullType',
                type: {
                  kind: 'NamedType',
                  name: { kind: 'Name', value: 'ID', loc: { start: 1016, end: 1018 } },
                  loc: { start: 1016, end: 1018 },
                },
                loc: { start: 1016, end: 1019 },
              },
              directives: [],
              loc: { start: 1012, end: 1019 },
            },
          ],
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'Boolean', loc: { start: 1022, end: 1029 } },
              loc: { start: 1022, end: 1029 },
            },
            loc: { start: 1022, end: 1030 },
          },
          directives: [
            {
              kind: 'Directive',
              name: { kind: 'Name', value: 'auth', loc: { start: 1032, end: 1036 } },
              arguments: [],
              loc: { start: 1031, end: 1036 },
            },
          ],
          loc: { start: 941, end: 1036 },
        },
      ],
      loc: { start: 692, end: 1038 },
    },
    {
      kind: 'ObjectTypeExtension',
      name: { kind: 'Name', value: 'Subscription', loc: { start: 1052, end: 1064 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value:
              'New created note TODO subscriptions only for testing, lacking auth...',
            block: false,
            loc: { start: 1069, end: 1140 },
          },
          name: { kind: 'Name', value: 'noteCreated', loc: { start: 1143, end: 1154 } },
          arguments: [],
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'Note', loc: { start: 1156, end: 1160 } },
              loc: { start: 1156, end: 1160 },
            },
            loc: { start: 1156, end: 1161 },
          },
          directives: [],
          loc: { start: 1069, end: 1161 },
        },
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'Updated note TODO subscriptions only for testing, lacking auth...',
            block: false,
            loc: { start: 1164, end: 1231 },
          },
          name: { kind: 'Name', value: 'noteUpdated', loc: { start: 1234, end: 1245 } },
          arguments: [],
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'Note', loc: { start: 1247, end: 1251 } },
              loc: { start: 1247, end: 1251 },
            },
            loc: { start: 1247, end: 1252 },
          },
          directives: [],
          loc: { start: 1164, end: 1252 },
        },
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'Removed note ID TODO subscriptions only for testing, lacking auth...',
            block: false,
            loc: { start: 1255, end: 1325 },
          },
          name: { kind: 'Name', value: 'noteDeleted', loc: { start: 1328, end: 1339 } },
          arguments: [],
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'ID', loc: { start: 1341, end: 1343 } },
              loc: { start: 1341, end: 1343 },
            },
            loc: { start: 1341, end: 1344 },
          },
          directives: [],
          loc: { start: 1255, end: 1344 },
        },
      ],
      loc: { start: 1040, end: 1346 },
    },
    {
      kind: 'ObjectTypeDefinition',
      name: { kind: 'Name', value: 'Session', loc: { start: 1352, end: 1359 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'Session ID',
            block: false,
            loc: { start: 1364, end: 1376 },
          },
          name: { kind: 'Name', value: 'id', loc: { start: 1379, end: 1381 } },
          arguments: [],
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'ID', loc: { start: 1383, end: 1385 } },
              loc: { start: 1383, end: 1385 },
            },
            loc: { start: 1383, end: 1386 },
          },
          directives: [],
          loc: { start: 1364, end: 1386 },
        },
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'User that is using this session',
            block: false,
            loc: { start: 1389, end: 1422 },
          },
          name: { kind: 'Name', value: 'userId', loc: { start: 1425, end: 1431 } },
          arguments: [],
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'ID', loc: { start: 1433, end: 1435 } },
              loc: { start: 1433, end: 1435 },
            },
            loc: { start: 1433, end: 1436 },
          },
          directives: [],
          loc: { start: 1389, end: 1436 },
        },
      ],
      loc: { start: 1347, end: 1438 },
    },
    {
      kind: 'EnumTypeDefinition',
      name: { kind: 'Name', value: 'AuthProvider', loc: { start: 1445, end: 1457 } },
      directives: [],
      values: [
        {
          kind: 'EnumValueDefinition',
          name: { kind: 'Name', value: 'GOOGLE', loc: { start: 1462, end: 1468 } },
          directives: [],
          loc: { start: 1462, end: 1468 },
        },
      ],
      loc: { start: 1440, end: 1470 },
    },
    {
      kind: 'InputObjectTypeDefinition',
      name: { kind: 'Name', value: 'SignInInput', loc: { start: 1478, end: 1489 } },
      directives: [],
      fields: [
        {
          kind: 'InputValueDefinition',
          name: { kind: 'Name', value: 'provider', loc: { start: 1494, end: 1502 } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: {
                kind: 'Name',
                value: 'AuthProvider',
                loc: { start: 1504, end: 1516 },
              },
              loc: { start: 1504, end: 1516 },
            },
            loc: { start: 1504, end: 1517 },
          },
          directives: [],
          loc: { start: 1494, end: 1517 },
        },
        {
          kind: 'InputValueDefinition',
          name: { kind: 'Name', value: 'token', loc: { start: 1520, end: 1525 } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String', loc: { start: 1527, end: 1533 } },
              loc: { start: 1527, end: 1533 },
            },
            loc: { start: 1527, end: 1534 },
          },
          directives: [],
          loc: { start: 1520, end: 1534 },
        },
      ],
      loc: { start: 1472, end: 1536 },
    },
    {
      kind: 'ObjectTypeExtension',
      name: { kind: 'Name', value: 'Query', loc: { start: 1550, end: 1555 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'Count of sessions saved in http-only cookie',
            block: false,
            loc: { start: 1560, end: 1605 },
          },
          name: { kind: 'Name', value: 'sessionCount', loc: { start: 1608, end: 1620 } },
          arguments: [],
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'Int', loc: { start: 1622, end: 1625 } },
            loc: { start: 1622, end: 1625 },
          },
          directives: [
            {
              kind: 'Directive',
              name: { kind: 'Name', value: 'auth', loc: { start: 1627, end: 1631 } },
              arguments: [],
              loc: { start: 1626, end: 1631 },
            },
          ],
          loc: { start: 1560, end: 1631 },
        },
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'Currently active session index saved in http-only cookie',
            block: false,
            loc: { start: 1634, end: 1692 },
          },
          name: {
            kind: 'Name',
            value: 'activeSessionIndex',
            loc: { start: 1695, end: 1713 },
          },
          arguments: [],
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'Int', loc: { start: 1715, end: 1718 } },
            loc: { start: 1715, end: 1718 },
          },
          directives: [
            {
              kind: 'Directive',
              name: { kind: 'Name', value: 'auth', loc: { start: 1720, end: 1724 } },
              arguments: [],
              loc: { start: 1719, end: 1724 },
            },
          ],
          loc: { start: 1634, end: 1724 },
        },
      ],
      loc: { start: 1538, end: 1726 },
    },
    {
      kind: 'ObjectTypeExtension',
      name: { kind: 'Name', value: 'Mutation', loc: { start: 1740, end: 1748 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: 'FieldDefinition',
          name: { kind: 'Name', value: 'signIn', loc: { start: 1753, end: 1759 } },
          arguments: [
            {
              kind: 'InputValueDefinition',
              name: { kind: 'Name', value: 'input', loc: { start: 1760, end: 1765 } },
              type: {
                kind: 'NonNullType',
                type: {
                  kind: 'NamedType',
                  name: {
                    kind: 'Name',
                    value: 'SignInInput',
                    loc: { start: 1767, end: 1778 },
                  },
                  loc: { start: 1767, end: 1778 },
                },
                loc: { start: 1767, end: 1779 },
              },
              directives: [],
              loc: { start: 1760, end: 1779 },
            },
          ],
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'Boolean', loc: { start: 1782, end: 1789 } },
              loc: { start: 1782, end: 1789 },
            },
            loc: { start: 1782, end: 1790 },
          },
          directives: [],
          loc: { start: 1753, end: 1790 },
        },
        {
          kind: 'FieldDefinition',
          name: { kind: 'Name', value: 'signOut', loc: { start: 1793, end: 1800 } },
          arguments: [],
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'Boolean', loc: { start: 1802, end: 1809 } },
              loc: { start: 1802, end: 1809 },
            },
            loc: { start: 1802, end: 1810 },
          },
          directives: [
            {
              kind: 'Directive',
              name: { kind: 'Name', value: 'auth', loc: { start: 1812, end: 1816 } },
              arguments: [],
              loc: { start: 1811, end: 1816 },
            },
          ],
          loc: { start: 1793, end: 1816 },
        },
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'Change session to new index from http-only cookie',
            block: false,
            loc: { start: 1819, end: 1870 },
          },
          name: {
            kind: 'Name',
            value: 'switchToSession',
            loc: { start: 1873, end: 1888 },
          },
          arguments: [
            {
              kind: 'InputValueDefinition',
              name: { kind: 'Name', value: 'index', loc: { start: 1889, end: 1894 } },
              type: {
                kind: 'NonNullType',
                type: {
                  kind: 'NamedType',
                  name: { kind: 'Name', value: 'Int', loc: { start: 1896, end: 1899 } },
                  loc: { start: 1896, end: 1899 },
                },
                loc: { start: 1896, end: 1900 },
              },
              directives: [],
              loc: { start: 1889, end: 1900 },
            },
          ],
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'Boolean', loc: { start: 1903, end: 1910 } },
              loc: { start: 1903, end: 1910 },
            },
            loc: { start: 1903, end: 1911 },
          },
          directives: [
            {
              kind: 'Directive',
              name: { kind: 'Name', value: 'auth', loc: { start: 1913, end: 1917 } },
              arguments: [],
              loc: { start: 1912, end: 1917 },
            },
          ],
          loc: { start: 1819, end: 1917 },
        },
      ],
      loc: { start: 1728, end: 1919 },
    },
    {
      kind: 'ObjectTypeDefinition',
      name: { kind: 'Name', value: 'User', loc: { start: 1925, end: 1929 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: 'FieldDefinition',
          description: {
            kind: 'StringValue',
            value: 'User unique ID',
            block: false,
            loc: { start: 1934, end: 1950 },
          },
          name: { kind: 'Name', value: 'id', loc: { start: 1953, end: 1955 } },
          arguments: [],
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'ID', loc: { start: 1957, end: 1959 } },
              loc: { start: 1957, end: 1959 },
            },
            loc: { start: 1957, end: 1960 },
          },
          directives: [],
          loc: { start: 1934, end: 1960 },
        },
      ],
      loc: { start: 1920, end: 1962 },
    },
  ],
  loc: { start: 0, end: 1963 },
} as unknown as DocumentNode;
