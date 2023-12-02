import type { DocumentNode } from 'graphql';
  export const typeDefs = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Query","loc":{"start":5,"end":10}},"interfaces":[],"directives":[],"fields":[],"loc":{"start":0,"end":10}},{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Mutation","loc":{"start":17,"end":25}},"interfaces":[],"directives":[],"fields":[],"loc":{"start":12,"end":25}},{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Subscription","loc":{"start":32,"end":44}},"interfaces":[],"directives":[],"fields":[],"loc":{"start":27,"end":44}},{"kind":"DirectiveDefinition","description":{"kind":"StringValue","value":"Requires user to be authenticated and with access to specific role","block":false,"loc":{"start":46,"end":114}},"name":{"kind":"Name","value":"auth","loc":{"start":126,"end":130}},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"requires","loc":{"start":131,"end":139}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Role","loc":{"start":141,"end":145}},"loc":{"start":141,"end":145}},"defaultValue":{"kind":"EnumValue","value":"USER","loc":{"start":148,"end":152}},"directives":[],"loc":{"start":131,"end":152}}],"repeatable":false,"locations":[{"kind":"Name","value":"OBJECT","loc":{"start":157,"end":163}},{"kind":"Name","value":"FIELD_DEFINITION","loc":{"start":166,"end":182}}],"loc":{"start":46,"end":182}},{"kind":"EnumTypeDefinition","name":{"kind":"Name","value":"Role","loc":{"start":189,"end":193}},"directives":[],"values":[{"kind":"EnumValueDefinition","name":{"kind":"Name","value":"USER","loc":{"start":198,"end":202}},"directives":[],"loc":{"start":198,"end":202}}],"loc":{"start":184,"end":204}},{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Note","loc":{"start":210,"end":214}},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"Note unique ID","block":false,"loc":{"start":219,"end":235}},"name":{"kind":"Name","value":"id","loc":{"start":238,"end":240}},"arguments":[],"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID","loc":{"start":242,"end":244}},"loc":{"start":242,"end":244}},"loc":{"start":242,"end":245}},"directives":[],"loc":{"start":219,"end":245}},{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"Note title","block":false,"loc":{"start":248,"end":260}},"name":{"kind":"Name","value":"title","loc":{"start":263,"end":268}},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"String","loc":{"start":270,"end":276}},"loc":{"start":270,"end":276}},"directives":[],"loc":{"start":248,"end":276}},{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"Note text contents","block":false,"loc":{"start":279,"end":299}},"name":{"kind":"Name","value":"content","loc":{"start":302,"end":309}},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"String","loc":{"start":311,"end":317}},"loc":{"start":311,"end":317}},"directives":[],"loc":{"start":279,"end":317}}],"loc":{"start":205,"end":319}},{"kind":"InputObjectTypeDefinition","name":{"kind":"Name","value":"CreateNoteInput","loc":{"start":327,"end":342}},"directives":[],"fields":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"title","loc":{"start":347,"end":352}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String","loc":{"start":354,"end":360}},"loc":{"start":354,"end":360}},"directives":[],"loc":{"start":347,"end":360}},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"content","loc":{"start":363,"end":370}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String","loc":{"start":372,"end":378}},"loc":{"start":372,"end":378}},"directives":[],"loc":{"start":363,"end":378}}],"loc":{"start":321,"end":380}},{"kind":"InputObjectTypeDefinition","name":{"kind":"Name","value":"UpdateNoteInput","loc":{"start":388,"end":403}},"directives":[],"fields":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"id","loc":{"start":408,"end":410}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID","loc":{"start":412,"end":414}},"loc":{"start":412,"end":414}},"loc":{"start":412,"end":415}},"directives":[],"loc":{"start":408,"end":415}},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"title","loc":{"start":418,"end":423}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String","loc":{"start":425,"end":431}},"loc":{"start":425,"end":431}},"directives":[],"loc":{"start":418,"end":431}},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"content","loc":{"start":434,"end":441}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String","loc":{"start":443,"end":449}},"loc":{"start":443,"end":449}},"directives":[],"loc":{"start":434,"end":449}}],"loc":{"start":382,"end":451}},{"kind":"ObjectTypeExtension","name":{"kind":"Name","value":"Query","loc":{"start":465,"end":470}},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"Get all notes belonging to a user of active session","block":false,"loc":{"start":475,"end":528}},"name":{"kind":"Name","value":"notes","loc":{"start":531,"end":536}},"arguments":[],"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Note","loc":{"start":539,"end":543}},"loc":{"start":539,"end":543}},"loc":{"start":539,"end":544}},"loc":{"start":538,"end":545}},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"auth","loc":{"start":547,"end":551}},"arguments":[],"loc":{"start":546,"end":551}}],"loc":{"start":475,"end":551}},{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"Get note by ID belonging to a user of active session","block":false,"loc":{"start":554,"end":608}},"name":{"kind":"Name","value":"note","loc":{"start":611,"end":615}},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"id","loc":{"start":616,"end":618}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String","loc":{"start":620,"end":626}},"loc":{"start":620,"end":626}},"loc":{"start":620,"end":627}},"directives":[],"loc":{"start":616,"end":627}}],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Note","loc":{"start":630,"end":634}},"loc":{"start":630,"end":634}},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"auth","loc":{"start":636,"end":640}},"arguments":[],"loc":{"start":635,"end":640}}],"loc":{"start":554,"end":640}}],"loc":{"start":453,"end":642}},{"kind":"ObjectTypeExtension","name":{"kind":"Name","value":"Mutation","loc":{"start":656,"end":664}},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"Create a new note belonging to a user of active session","block":false,"loc":{"start":669,"end":726}},"name":{"kind":"Name","value":"createNote","loc":{"start":729,"end":739}},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"input","loc":{"start":740,"end":745}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateNoteInput","loc":{"start":747,"end":762}},"loc":{"start":747,"end":762}},"loc":{"start":747,"end":763}},"directives":[],"loc":{"start":740,"end":763}}],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Note","loc":{"start":766,"end":770}},"loc":{"start":766,"end":770}},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"auth","loc":{"start":772,"end":776}},"arguments":[],"loc":{"start":771,"end":776}}],"loc":{"start":669,"end":776}},{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"Update note by ID belonging to a user of active session","block":false,"loc":{"start":779,"end":836}},"name":{"kind":"Name","value":"updateNote","loc":{"start":839,"end":849}},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"input","loc":{"start":850,"end":855}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateNoteInput","loc":{"start":857,"end":872}},"loc":{"start":857,"end":872}},"loc":{"start":857,"end":873}},"directives":[],"loc":{"start":850,"end":873}}],"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean","loc":{"start":876,"end":883}},"loc":{"start":876,"end":883}},"loc":{"start":876,"end":884}},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"auth","loc":{"start":886,"end":890}},"arguments":[],"loc":{"start":885,"end":890}}],"loc":{"start":779,"end":890}},{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"Delete note by ID belonging to a user of active session","block":false,"loc":{"start":893,"end":950}},"name":{"kind":"Name","value":"deleteNote","loc":{"start":953,"end":963}},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"id","loc":{"start":964,"end":966}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID","loc":{"start":968,"end":970}},"loc":{"start":968,"end":970}},"loc":{"start":968,"end":971}},"directives":[],"loc":{"start":964,"end":971}}],"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean","loc":{"start":974,"end":981}},"loc":{"start":974,"end":981}},"loc":{"start":974,"end":982}},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"auth","loc":{"start":984,"end":988}},"arguments":[],"loc":{"start":983,"end":988}}],"loc":{"start":893,"end":988}}],"loc":{"start":644,"end":990}},{"kind":"ObjectTypeExtension","name":{"kind":"Name","value":"Subscription","loc":{"start":1004,"end":1016}},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"New created note TODO subscriptions only for testing, lacking auth...","block":false,"loc":{"start":1021,"end":1092}},"name":{"kind":"Name","value":"noteCreated","loc":{"start":1095,"end":1106}},"arguments":[],"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Note","loc":{"start":1108,"end":1112}},"loc":{"start":1108,"end":1112}},"loc":{"start":1108,"end":1113}},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"auth","loc":{"start":1115,"end":1119}},"arguments":[],"loc":{"start":1114,"end":1119}}],"loc":{"start":1021,"end":1119}},{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"Updated note TODO subscriptions only for testing, lacking auth...","block":false,"loc":{"start":1122,"end":1189}},"name":{"kind":"Name","value":"noteUpdated","loc":{"start":1192,"end":1203}},"arguments":[],"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Note","loc":{"start":1205,"end":1209}},"loc":{"start":1205,"end":1209}},"loc":{"start":1205,"end":1210}},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"auth","loc":{"start":1212,"end":1216}},"arguments":[],"loc":{"start":1211,"end":1216}}],"loc":{"start":1122,"end":1216}},{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"Removed note ID TODO subscriptions only for testing, lacking auth...","block":false,"loc":{"start":1219,"end":1289}},"name":{"kind":"Name","value":"noteDeleted","loc":{"start":1292,"end":1303}},"arguments":[],"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID","loc":{"start":1305,"end":1307}},"loc":{"start":1305,"end":1307}},"loc":{"start":1305,"end":1308}},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"auth","loc":{"start":1310,"end":1314}},"arguments":[],"loc":{"start":1309,"end":1314}}],"loc":{"start":1219,"end":1314}}],"loc":{"start":992,"end":1316}},{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Session","loc":{"start":1322,"end":1329}},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"Session ID","block":false,"loc":{"start":1334,"end":1346}},"name":{"kind":"Name","value":"id","loc":{"start":1349,"end":1351}},"arguments":[],"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID","loc":{"start":1353,"end":1355}},"loc":{"start":1353,"end":1355}},"loc":{"start":1353,"end":1356}},"directives":[],"loc":{"start":1334,"end":1356}},{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"User that is using this session","block":false,"loc":{"start":1359,"end":1392}},"name":{"kind":"Name","value":"userId","loc":{"start":1395,"end":1401}},"arguments":[],"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID","loc":{"start":1403,"end":1405}},"loc":{"start":1403,"end":1405}},"loc":{"start":1403,"end":1406}},"directives":[],"loc":{"start":1359,"end":1406}}],"loc":{"start":1317,"end":1408}},{"kind":"EnumTypeDefinition","name":{"kind":"Name","value":"AuthProvider","loc":{"start":1415,"end":1427}},"directives":[],"values":[{"kind":"EnumValueDefinition","name":{"kind":"Name","value":"GOOGLE","loc":{"start":1432,"end":1438}},"directives":[],"loc":{"start":1432,"end":1438}}],"loc":{"start":1410,"end":1440}},{"kind":"InputObjectTypeDefinition","name":{"kind":"Name","value":"SignInInput","loc":{"start":1448,"end":1459}},"directives":[],"fields":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"provider","loc":{"start":1464,"end":1472}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AuthProvider","loc":{"start":1474,"end":1486}},"loc":{"start":1474,"end":1486}},"loc":{"start":1474,"end":1487}},"directives":[],"loc":{"start":1464,"end":1487}},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"token","loc":{"start":1490,"end":1495}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String","loc":{"start":1497,"end":1503}},"loc":{"start":1497,"end":1503}},"loc":{"start":1497,"end":1504}},"directives":[],"loc":{"start":1490,"end":1504}}],"loc":{"start":1442,"end":1506}},{"kind":"ObjectTypeExtension","name":{"kind":"Name","value":"Query","loc":{"start":1520,"end":1525}},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"Count of sessions saved in http-only cookie","block":false,"loc":{"start":1530,"end":1575}},"name":{"kind":"Name","value":"sessionCount","loc":{"start":1578,"end":1590}},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int","loc":{"start":1592,"end":1595}},"loc":{"start":1592,"end":1595}},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"auth","loc":{"start":1597,"end":1601}},"arguments":[],"loc":{"start":1596,"end":1601}}],"loc":{"start":1530,"end":1601}},{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"Currently active session index saved in http-only cookie","block":false,"loc":{"start":1604,"end":1662}},"name":{"kind":"Name","value":"activeSessionIndex","loc":{"start":1665,"end":1683}},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int","loc":{"start":1685,"end":1688}},"loc":{"start":1685,"end":1688}},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"auth","loc":{"start":1690,"end":1694}},"arguments":[],"loc":{"start":1689,"end":1694}}],"loc":{"start":1604,"end":1694}}],"loc":{"start":1508,"end":1696}},{"kind":"ObjectTypeExtension","name":{"kind":"Name","value":"Mutation","loc":{"start":1710,"end":1718}},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"On successful sign in, session id is stored in a http-only cookie. Index of that id is returned. If couldn't sign in, -1 is returned instead.","block":false,"loc":{"start":1723,"end":1866}},"name":{"kind":"Name","value":"signIn","loc":{"start":1869,"end":1875}},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"input","loc":{"start":1876,"end":1881}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SignInInput","loc":{"start":1883,"end":1894}},"loc":{"start":1883,"end":1894}},"loc":{"start":1883,"end":1895}},"directives":[],"loc":{"start":1876,"end":1895}}],"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int","loc":{"start":1898,"end":1901}},"loc":{"start":1898,"end":1901}},"loc":{"start":1898,"end":1902}},"directives":[],"loc":{"start":1723,"end":1902}},{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"Returns signed out cookie session index or -1 was not signed in.","block":false,"loc":{"start":1905,"end":1971}},"name":{"kind":"Name","value":"signOut","loc":{"start":1974,"end":1981}},"arguments":[],"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int","loc":{"start":1983,"end":1986}},"loc":{"start":1983,"end":1986}},"loc":{"start":1983,"end":1987}},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"auth","loc":{"start":1989,"end":1993}},"arguments":[],"loc":{"start":1988,"end":1993}}],"loc":{"start":1905,"end":1993}},{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"Switch session to new index which is tied to http-only session cookie. Returns switched to session index.","block":false,"loc":{"start":1996,"end":2103}},"name":{"kind":"Name","value":"switchToSession","loc":{"start":2106,"end":2121}},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"index","loc":{"start":2122,"end":2127}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int","loc":{"start":2129,"end":2132}},"loc":{"start":2129,"end":2132}},"loc":{"start":2129,"end":2133}},"directives":[],"loc":{"start":2122,"end":2133}}],"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int","loc":{"start":2136,"end":2139}},"loc":{"start":2136,"end":2139}},"loc":{"start":2136,"end":2140}},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"auth","loc":{"start":2142,"end":2146}},"arguments":[],"loc":{"start":2141,"end":2146}}],"loc":{"start":1996,"end":2146}}],"loc":{"start":1698,"end":2148}},{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"User","loc":{"start":2154,"end":2158}},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","description":{"kind":"StringValue","value":"User unique ID","block":false,"loc":{"start":2163,"end":2179}},"name":{"kind":"Name","value":"id","loc":{"start":2182,"end":2184}},"arguments":[],"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID","loc":{"start":2186,"end":2188}},"loc":{"start":2186,"end":2188}},"loc":{"start":2186,"end":2189}},"directives":[],"loc":{"start":2163,"end":2189}}],"loc":{"start":2149,"end":2191}}],"loc":{"start":0,"end":2192}} as unknown as DocumentNode