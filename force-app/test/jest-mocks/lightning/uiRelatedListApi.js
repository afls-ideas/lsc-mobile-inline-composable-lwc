/**
 * Manual Jest mock for lightning/uiRelatedListApi.
 *
 * sfdx-lwc-jest does not ship a stub for getRelatedListRecords, so we register
 * our own test wire adapter. getRelatedListRecords is an LDS wire adapter, so
 * we use createLdsTestWireAdapter: .emit(data) pushes { data, error: undefined }
 * into the @wire, and .emitError({...}) pushes an error.
 */
import { createLdsTestWireAdapter } from '@salesforce/wire-service-jest-util';

export const getRelatedListRecords = createLdsTestWireAdapter(jest.fn());
