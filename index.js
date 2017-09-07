const request = require('./request');
const log = require('./logging');
const gpu = require('./gpu');
const regular_report_interval = 30;

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
let minerName = argv.miner.substring(argv.miner.lastIndexOf('/')+1);
if (minerName === 'miner' && argv.mod === 'ewbf') {
  minerName = 'ewbf';
}
if (minerName !== 'ethminer' && minerName !== 'ewbf' && minerName !== 'ccminer') {
  log.error(`unsupported miner ${argv.miner}.`);
  process.exit(1);
}

const TOKEN = argv.token;
const WORKER = argv.worker;
let eventApiEndpoint = `http://${argv.host}/api/events`;
let minerProcess;
let reportTimeout;
log.info(`worker: ${argv.worker}`);
log.info('nvidia-smi:');
gpu((err, list) => {
  if (err) {
    log.error(err);
    return;
  }

  log.info(list.map(gpu => (gpu.index + ' ' + gpu.name)).join('\n'));
  request.post(eventApiEndpoint, TOKEN, WORKER, {action: 'start', payload: list }, (err) => {
    if (err) {
      return log.error('reporting started status failed.');
    }
    log.info('started status was reported.');
  });
  startGPUReportor();

  const opts = {
    miner: argv.miner,
    params: argv.params,
  };
  if (minerName === 'ethminer') {
    minerProcess =  new (require('./emitters/ethminer'))(opts);
  } else if (minerName === 'ewbf') {
    minerProcess = new (require('./emitters/ewbf'))(opts);
  }

  minerProcess.on('error', () => {
    minerProcess.kill();
    process.exit(1);
  });
  minerProcess.on('exit', () => {
    log.info('miner exit.');
    process.exit(1);
  });
  minerProcess.on('share', (share) => {
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
  minerProcess.start();
  process.on('exit', () => {
    log.info('exiting, kill the miner.');
    minerProcess.kill();
  });
  process.on('SIGTERM', () => {//kill, pkill
    log.info('Received SIGTERM.');
    minerProcess.kill();
    process.exit(1);
  });
});

function startGPUReportor() {
  if (!reportTimeout) {
    reportTimeout = setTimeout(readGPUandReport, regular_report_interval * 1000);
  }
}

function readGPUandReport() {
  if (reportTimeout) {
    clearTimeout(reportTimeout);
    reportTimeout = null;
  }
  gpu((err, list) => {
    if (err) {
      log.error(err);
      process.exit(1);
      return;
    }

    if (minerName === 'ewbf') {//get miner stat
      minerProcess.getStat((err, result) => {
        if (err) {
          log.error(err);
          process.exit(1);
        }

        if (result.newShare) {
          if (result.gpus && result.gpus.length && result.gpus.length === list.length) {
            list = list.map((e, index) => {
              return Object.assign(e, result.gpus[index]);
            });
          }

          //report
          let reportObj = {
            gpus: list,
            hashrate: result.hashrate,
          };
          request.post(eventApiEndpoint, TOKEN, WORKER, {action: 'share', payload: reportObj}, () => {
            startGPUReportor();
          });
        } else {
          const payload = {action: 'regular', payload: list};
          request.post(eventApiEndpoint, TOKEN, WORKER, payload, () => {
            startGPUReportor();
          });
        }
      });
    } else {
      log.info('regular reporting.......');
      const payload = {action: 'regular', payload: list};
      request.post(eventApiEndpoint, TOKEN, WORKER, payload, () => {
        startGPUReportor();
      });
    }
  });
}
