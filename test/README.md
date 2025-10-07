# Testing Guide for 3D Model Viewer Pro

## Overview

This directory contains comprehensive testing suites for the 3D Model Viewer Pro application, including unit tests, integration tests, and automated browser testing.

## Test Types

### 1. Live Console Testing (`live-console-testing.js`)

Automated end-to-end testing using Puppeteer that:
- Starts a real development server
- Opens a browser and navigates to the application
- Tests all major functionality with visual screenshots
- Monitors console for errors and warnings
- Generates comprehensive HTML and JSON reports

**Usage:**
```bash
npm run test:live
# or
node test/live-console-testing.js
```

**Features:**
- ✅ Server startup and management
- ✅ Real browser automation
- ✅ Console error detection
- ✅ Screenshot capture at each step
- ✅ Sample model loading tests
- ✅ URL loading tests
- ✅ File upload interface tests
- ✅ UI controls testing
- ✅ Superhero mode testing
- ✅ Comprehensive reporting

### 2. Systematic UI Testing (`systematic-ui-testing.test.js`)

Jest-based UI testing with Puppeteer for systematic testing of UI components.

### 3. Unit Tests

Individual module testing using Jasmine:
- `modular-architecture.test.js` - Core architecture tests
- `error-handling.test.js` - Error management system tests
- `performance-optimization.test.js` - Performance monitoring tests
- And more...

### 4. Integration Tests

Cross-module functionality testing:
- `cinematic-integration.test.js` - Cinematic mode integration
- `advanced-threejs-integration.test.js` - Advanced rendering features
- `online-library-integration.test.js` - Asset library integration

## Running Tests

### All Tests
```bash
npm test
```

### Live Browser Testing
```bash
npm run test:live
```

### Individual Test Files
```bash
# Run specific test
npx jest test/specific-test.test.js

# Run with Karma
karma start --single-run
```

## Test Reports

### Live Testing Reports
- `test-report-live.html` - Visual HTML report with screenshots
- `test-report-live.json` - Detailed JSON data
- `test-screenshots/` - Directory with all captured screenshots

### Coverage Reports
Test coverage reports are generated in the `coverage/` directory.

## Writing Tests

### Live Console Tests
Add new test steps to the `runAllTests()` method in `live-console-testing.js`:

```javascript
await this.testStep('My New Test', async () => {
    // Test implementation
    await this.takeScreenshot('test-step', 'Description');
});
```

### Unit Tests
Follow the existing pattern in test files:

```javascript
describe('Module Name', () => {
    test('should do something', () => {
        // Test implementation
    });
});
```

## Best Practices

1. **Always take screenshots** for visual verification
2. **Use descriptive test names** and step descriptions
3. **Handle errors gracefully** with try-catch blocks
4. **Clean up resources** in finally blocks
5. **Use appropriate timeouts** for async operations
6. **Test both success and failure scenarios**

## Troubleshooting

### Common Issues

1. **Server startup timeout**: Increase timeout in `startServer()` method
2. **Element not found**: Update selectors in test steps
3. **Browser crashes**: Check system resources and Chrome flags
4. **Screenshot failures**: Ensure `test-screenshots/` directory exists

### Debug Mode

Run tests with additional logging:
```bash
DEBUG=true npm run test:live
```

### Manual Testing

For manual testing, use the demo files:
- `error-handling-demo.html` - Error system testing
- `cinematic-demo.html` - Superhero mode testing
- `advanced-lighting-demo.html` - Rendering features
- `file-management-demo.html` - File management testing

## Dependencies

- **Puppeteer**: Browser automation
- **Express**: Test server
- **Jasmine**: Unit testing framework
- **Karma**: Test runner
- **Jest**: Alternative test framework

## Configuration

Test configuration files:
- `karma.conf.js` - Karma test runner configuration
- `test/test-server.js` - Express server for integration tests

## Continuous Integration

Tests are automatically run in CI/CD pipelines. See `.github/workflows/` for configuration.