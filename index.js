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
    .argv

console.dir(argv)
// const { execFile } = require('child_process');
// const ping = execFile('ping', ['baidu.com', '-c', '4']);
//
// ping.stdout.on('data', (data) => {
//   console.log(`输出：${data}`);
// });
//
// ping.stderr.on('data', (data) => {
//   console.log(`错误：${data}`);
// });
//
// ping.on('close', (code) => {
//   console.log(`子进程退出码：${code}`);
// });
//
// ping.on('exit', (code, signal) => {
//   console.log(`exit code: ${code}`);
//   console.log(`exit signal: ${signal}`);
// })
