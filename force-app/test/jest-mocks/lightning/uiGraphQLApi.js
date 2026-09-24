/**
 * Manual Jest mock for lightning/uiGraphQLApi.
 *
 * The real graphql wire adapter emits { data, errors } (errors is a plural
 * array — GraphQL can return partial data alongside errors), which doesn't
 * match createLdsTestWireAdapter's hardcoded { data, error } shape. We use
 * the generic createTestWireAdapter instead so tests can .emit(...) the
 * exact { data, errors } shape the compiled component expects. gql is a
 * tagged-template helper in the real module; here it's just an identity
 * passthrough — tests only care about what the wire adapter emits, not the
 * query text itself.
 */
import { createTestWireAdapter } from '@salesforce/wire-service-jest-util';

export const graphql = createTestWireAdapter(jest.fn());

export function gql(strings, ...values) {
    return strings.raw ? strings.raw.reduce((acc, part, i) => acc + part + (values[i] ?? ''), '') : strings;
}
