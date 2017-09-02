const EventEmitter = require('events');
const { spawnSync, spawn } = require('child_process');
const log = require('../logging');

class EthminerMonitor extends EventEmitter {
  constructor(opts) {
    super();
    this.miner = opts.miner;
    this.params = opts.params;
  }

  start() {
    log.info(`calling ${this.miner} -U --list-devices to correct the GPU orders.`);
    const devicesResult = spawnSync(this.miner, ['-U', '--list-devices'], {encoding: 'utf8'});
    if (devicesResult.error) {
      this.emit('error', devicesResult.error);
      return;
    }

    const lines = devicesResult.stderr.split('\n');
    let newGPU = false;
    let GPUArr = [];
    for(const line of lines) {
      if (line.startsWith('[')) {
        newGPU = true;
      } else if (newGPU) {
        const pciBusId = line.substring(line.indexOf(':') + 1);
        GPUArr.push(+pciBusId);
        newGPU = false;
      }
    }

    this.GPUArr = GPUArr.map(g => ({pciBusId: g}));
    this.emit('id2pciBusId', this.GPUArr);

    log.info(`${this.miner} ${this.params}`);
    const miner = spawn(this.miner, this.params.split(' '));
    miner.stdout.on('data', data => {
      log.info(`stdout: ${data}`);
    });
    miner.stderr.on('data', data => {
      log.error(`stderr: ${data}`);
    });
    miner.on('error', err => {
      log.error('error occurred.');
      log.error(err);
    });
    miner.on('exit', (code, signal) => {
      log.info(`exit code: ${code}`);
      log.info(`exit signal: ${signal}`);
    });
  }
}

module.exports = EthminerMonitor;
