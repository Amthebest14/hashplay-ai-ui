const fs = require('fs');
const b = JSON.parse(fs.readFileSync('artifacts/build-info/d7e2967b2e5ac7fcaf87671f31c3c082.json', 'utf8'));
console.log("Contract keys:", Object.keys(b.output.contracts));
Object.keys(b.output.contracts).forEach(k => {
    console.log(" -", k, "=>", Object.keys(b.output.contracts[k]));
});
