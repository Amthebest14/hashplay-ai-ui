const path = require('path');
const fs = require('fs');
const solc = require('solc');

const contractPath = path.resolve(__dirname, 'contracts', 'HashplayGame.sol');
const source = fs.readFileSync(contractPath, 'utf8');

function findImports(importPath) {
    if (importPath.startsWith('@openzeppelin/')) {
        const fullPath = path.resolve(__dirname, 'node_modules', importPath);
        return {
            contents: fs.readFileSync(fullPath, 'utf8')
        };
    }
    return { error: 'File not found' };
}

const input = {
    language: 'Solidity',
    sources: {
        'HashplayGame.sol': {
            content: source,
        },
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['abi', 'evm.bytecode'],
            },
        },
    },
};

console.log('Compiling contract...');
const compiled = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

if (compiled.errors) {
    compiled.errors.forEach(err => console.error(err.formattedMessage));
    if (compiled.errors.some(e => e.severity === 'error')) {
        process.exit(1);
    }
}

const contract = compiled.contracts['HashplayGame.sol']['HashplayGame'];

const output = {
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object
};

fs.writeFileSync(
    path.resolve(__dirname, 'HashplayGame.json'),
    JSON.stringify(output, null, 2)
);

console.log('Contract compiled successfully to HashplayGame.json');
