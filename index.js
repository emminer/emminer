const request = require('./request');
const log = require('./logging');
const gpu = require('./gpu');
const regular_report_interval = 10;

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
    }, 'w': {
      alias: 'worker',
      demandOption: true,
      describe: 'worker name',
      type: 'string',
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
const TOKEN = argv.token;
const WORKER = argv.worker;
let eventApiEndpoint = `http://${argv.host}/api/events`;
let reportTimeout;
log.info(`worker: ${argv.worker}`);
log.info('nvidia-smi:');
gpu((err, list) => {
  if (err) {
    log.error(err);
    return;
  }

  log.info(list.map(gpu => (gpu.index + ' ' + gpu.name)).join('\n'));
  startGPUReportor();

  const ethminer = new (require('./emitters/ethminer'))({
    miner: argv.miner,
    params: argv.params,
  });

  ethminer.on('error', () => {
    ethminer.kill();
    process.exit(1);
  });
  ethminer.on('exit', () => {
    process.exit(1);
  });
  ethminer.on('share', (share) => {
    if (reportTimeout) {
      clearTimeout(reportTimeout);
      reportTimeout = null;
    }

    gpu((err1, list1) => {
      if (err1) {
        log.error(err1);
        return;
      }

      if (share.gpus && share.gpus.length && share.gpus.length === list1.length) {
        list1 = list1.map((e, index) => {
          return Object.assign(e, share.gpus[index]);
        });
      }

      //report
      let reportObj = {
        gpus: list1,
        share: share.share,
        hashrate: share.hashrate,
      };
      request.post(eventApiEndpoint, TOKEN, WORKER, {action: 'share', payload: reportObj}, () => {
        startGPUReportor();
      });
    });
  });
  //ethminer.on('hashrate', log2console.bind(null, 'hashrate'));
  // ethminer.on('authorized', log2console.bind(null, 'authorized'));
  // ethminer.on('new_job', log2console.bind(null, 'new_job'));
  // ethminer.on('work_timeout', log2console.bind(null, 'work_timeout'));
  ethminer.start();
  process.on('exit', () => {
    log.info('exiting, kill the miner.');
    ethminer.kill();
  });
});

function startGPUReportor() {
  if (!reportTimeout) {
    reportTimeout = setTimeout(readGPUandReport, regular_report_interval * 1000);
  }
}

function readGPUandReport() {
  gpu((err, list) => {
    if (err) {
      log.error(err);
      return;
    }

    log.info('reporting.......');
    const payload = {action: 'regular', payload: list};
    request.post(eventApiEndpoint, TOKEN, WORKER, payload, () => {
      startGPUReportor();
    });
  });
}
