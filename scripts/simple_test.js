const fs = require('fs');
console.log('Hello from console');
fs.writeFileSync('scripts/simple_test.log', 'Hello from file');
