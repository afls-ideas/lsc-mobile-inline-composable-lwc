const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');

module.exports = {
    ...jestConfig,
    moduleNameMapper: {
        '^lightning/uiRelatedListApi$':
            '<rootDir>/force-app/test/jest-mocks/lightning/uiRelatedListApi'
    }
};
