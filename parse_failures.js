const fs = require('fs');
const data = JSON.parse(fs.readFileSync('final_failure.json', 'utf8'));
const failures = [];
data.testResults.forEach(suite => {
    suite.assertionResults.forEach(test => {
        if (test.status === 'failed') {
            failures.push(test.ancestorTitles.join(' > ') + ' > ' + test.title + '\n' + test.failureMessages.join('\n'));
        }
    });
});
fs.writeFileSync('out.txt', failures.join('\n\n'));
console.log('Done!');
