import { expect, it } from 'vitest';
import { ClientArgsTransform } from './client-args';
import { gql } from '@apollo/client';
import { print } from 'graphql';

it('removes single argument along with directive', () => {
  expect(
    print(
      new ClientArgsTransform({
        directiveName: 'test',
        argumentName: 'paths',
      }).transform(
        gql(`
          query Test {
            myName(foo: "bar") @test(paths: ["foo"]) {
              sub
            }
          }  
        `)
      )
    )
  ).toMatchInlineSnapshot(`
    "query Test {
      myName {
        sub
      }
    }"
  `);
});

it('allows paths to be a string', () => {
  expect(
    print(
      new ClientArgsTransform({
        directiveName: 'test',
        argumentName: 'paths',
      }).transform(
        gql(`
          query Test {
            myName(foo: "bar") @test(paths: "foo") {
              sub
            }
          }  
        `)
      )
    )
  ).toMatchInlineSnapshot(`
    "query Test {
      myName {
        sub
      }
    }"
  `);
});

it('ignores unknown directive argument', () => {
  expect(
    print(
      new ClientArgsTransform({
        directiveName: 'test',
        argumentName: 'paths',
      }).transform(
        gql(`
          query Test {
            myName(foo: "bar") @test(random: ["foo"]) {
              sub
            }
          }  
        `)
      )
    )
  ).toMatchInlineSnapshot(`
    "query Test {
      myName(foo: "bar") {
        sub
      }
    }"
  `);
});

it('removes object field', () => {
  expect(
    print(
      new ClientArgsTransform({
        directiveName: 'test',
        argumentName: 'paths',
      }).transform(
        gql(`
          query Test {
            myName(foo: {bar: "hello", bar: "keep"}) @test(paths: ["foo.bar"]) {
              sub
            }
          }  
        `)
      )
    )
  ).toMatchInlineSnapshot(`
    "query Test {
      myName(foo: {bar: "keep"}) {
        sub
      }
    }"
  `);
});

it('removes nested object field', () => {
  expect(
    print(
      new ClientArgsTransform({
        directiveName: 'test',
        argumentName: 'paths',
      }).transform(
        gql(`
          query Test {
            myName(foo: {a: { aa: "hello" }, b: "keep"}) @test(paths: ["foo.a.aa"]) {
              sub
            }
          }  
        `)
      )
    )
  ).toMatchInlineSnapshot(`
    "query Test {
      myName(foo: {b: "keep"}) {
        sub
      }
    }"
  `);
});

it('ignores other directives', () => {
  expect(
    print(
      new ClientArgsTransform({
        directiveName: 'test',
        argumentName: 'paths',
      }).transform(
        gql(`
          query Test {
            myName(foo: "bar", foo2: "bar2") @test(paths: ["foo"])  @other(paths: ["foo2"]) {
              sub
            }
          }  
        `)
      )
    )
  ).toMatchInlineSnapshot(`
    "query Test {
      myName(foo2: "bar2") @other(paths: ["foo2"]) {
        sub
      }
    }"
  `);
});

it('throws error on invalid argument path', () => {
  expect(() =>
    new ClientArgsTransform({
      directiveName: 'test',
      argumentName: 'paths',
    }).transform(
      gql(`
          query Test {
            field(foo: "bar", foo: "hi") @test(paths: ["unknown"]) {
              sub
            }
          }  
        `)
    )
  ).toThrowError('does not match any arguments');
});

it('complex operation', () => {
  expect(
    print(
      new ClientArgsTransform({
        directiveName: 'clientArgs',
        argumentName: 'paths',
      }).transform(
        gql(`
          query SearchNotesConnectionGrid_Query($userBy: UserByInput!, $searchText: String!, $first: NonNegativeInt, $after: String, $offline: Boolean) {
            signedInUser(by: $userBy) {
              id
              noteLinkSearchConnection(searchText: $searchText, first: $first, after: $after, extend: { offline: $offline }) @clientArgs(paths: ["extend.offline"]) {
              ...NotesConnectionGrid_UserNoteLinkConnectionFragment
              }  
            }
          }
        `)
      )
    )
  ).toMatchInlineSnapshot(`
    "query SearchNotesConnectionGrid_Query($userBy: UserByInput!, $searchText: String!, $first: NonNegativeInt, $after: String) {
      signedInUser(by: $userBy) {
        id
        noteLinkSearchConnection(searchText: $searchText, first: $first, after: $after) {
          ...NotesConnectionGrid_UserNoteLinkConnectionFragment
        }
      }
    }"
  `);
});
