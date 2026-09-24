const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');

module.exports = {
    ...jestConfig,
    moduleNameMapper: {
        '^lightning/uiGraphQLApi$':
            '<rootDir>/force-app/test/jest-mocks/lightning/uiGraphQLApi'
    }
};
