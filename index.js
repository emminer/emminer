const argv = require('yargs')
  .options({
    'm': {
      alias: 'miner',
      demandOption: true,
      describe: 'set the miner',
      type: 'string'
    }, 'p': {
      alias: 'params',
      demandOption: true,
      describe: 'parameters for the miner',
      type: 'string'
    }, 'c': {
      alias: 'coin',
      demandOption: true,
      describe: 'coin to mine',
      type: 'string'
    }, 't': {
      alias: 'token',
      demandOption: false,
      describe: 'token',
      type: 'string'
    }, 'd': {
      alias: 'host',
      demandOption: false,
      describe: 'host of server',
      type: 'string',
      default: 'localhost:3000'
    }, 'o': {
      alias: 'mod',
      demandOption: false,
      describe: 'mod of miner, e.g. sp_',
      type: 'string'
    }
  })
  .argv;

console.dir(argv);
