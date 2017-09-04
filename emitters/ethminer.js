const EventEmitter = require('events');
const { spawnSync, spawn } = require('child_process');
const stripAnsi = require('strip-ansi');
const log = require('../logging');

/*
events:
  share
  hashrate
  authorized
  new_job
  work_timeout
*/
class EthminerMonitor extends EventEmitter {
  constructor(opts) {
    super();
    this.miner = opts.miner;
    this.params = opts.params;
    this.hashrate = 0;
    this.GPUArr = [];
  }

  start() {
    log.info(`${this.miner} ${this.params}`);
    const miner = spawn(this.miner, this.params.split(' '));
    this.miner = miner;
    miner.stdout.on('data', data => {
      log.info(`${data}`.replace(/\n$/, ''));
    });
    miner.stderr.on('data', data => {
      data = data.toString('utf8');
      log.error(data.replace(/\n$/, ''));
      this.processStderr(stripAnsi(data));
    });
    miner.on('error', err => {
      log.error('error occurred.');
      log.error(err);
      this.emit('error', err);
    });
    miner.on('exit', (code, signal) => {
      log.info(`exit code: ${code}`);
      log.info(`exit signal: ${signal}`);
      this.emit('exit');
    });
  }

  processStderr(data) {
    let match;
    if ((match = data.match(/CUDA(\d+)\s*Solution found; Submitting/)) != null) {
      let cuda = match[1];
      this.share = {
        cuda: +cuda,
        gpu: +cuda,
      };
    } else if (data.indexOf('Submitting stale solution') >= 0) {
      if (this.share) {
        this.share.stale = true;
      }
    } else if (data.indexOf('B-) Submitted and accepted') >= 0) {
      if (this.share) {
        this.share.status = 'accepted';
      }
    } else if (data.indexOf(':-( Not accepted') >= 0) {
      if (this.share) {
        this.share.status = 'rejected';
      }
    } else if (data.indexOf('FAILURE: GPU gave incorrect result') >= 0) {
      if (this.share) {
        this.share.status = 'invalid';
      }
    } else if ((match = data.match(/Speed\s+([\d.]+)\s+Mh\/s/)) != null) {
      const total = match[1];
      this.hashrate = +total;
      const individualReg = /gpu\/(\d+)\s+([\d.]+)/g;
      let individualMatch;
      let individualHashrates = [];
      while((individualMatch = individualReg.exec(data)) != null) {
        individualHashrates.push(+(individualMatch[2]));
      }

      if (this.GPUArr.length) {
        if (individualHashrates.length !== this.GPUArr.length) {
          this.emit('error', new Error(`gpu lost, expected: ${this.GPUArr.length}, actual: ${individualHashrates.length}`));
          return;
        }
        for(let i = 0; i< individualHashrates.length; i++) {
          this.GPUArr[i].hashrate = individualHashrates[i];
        }
      } else {
        this.GPUArr = individualHashrates.map(hashrate => ({ hashrate }));
      }

      this.emit('hashrate', {total: this.hashrate, gpus: this.GPUArr});
    } else if ((match = data.match(/Authorized worker ([\w.]+)/)) != null) {
      this.worker = match[1];
      this.emit('authorized', {worker: this.worker});
    } else if (data.indexOf('Received new job #') >= 0) {
      this.emit('new_job');
    } else if (data.indexOf('No new work received in') >= 0) {
      this.emit('work_timeout', {msg: data});
    } else if (data.indexOf('CUDA error in') >= 0) {
      this.emit('error', new Error(data));
    }

    if (this.share && this.share.status) {
      let share = this.share;
      this.share = null;
      this.emit('share', {share, hashrate: this.hashrate, gpus: this.GPUArr});
    }
  }

  kill() {
    if (this.miner) {
      this.miner.kill();
    }
  }
}

module.exports = EthminerMonitor;
