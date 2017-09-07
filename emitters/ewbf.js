const request = require('../request');
const EventEmitter = require('events');
const { spawn } = require('child_process');
const log = require('../logging');

class EWBFMonitor extends EventEmitter {
  constructor(opts) {
    super();
    this.miner = opts.miner;
    this.params = opts.params;
    this.prevStat = null;
  }

  start() {
    log.info(`${this.miner} ${this.params}`);
    const miner = spawn(this.miner, this.params.split(' '));
    this.miner = miner;
    miner.stdout.on('data', data => {
      log.info(`${data}`.replace(/\n$/, ''));
    });
    miner.stderr.on('data', data => {
      log.error(`${data}`.replace(/\n$/, ''));
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

  kill() {
    if (this.miner) {
      this.miner.kill();
    }
  }

  // _getStat(cb) {
  //   cb && cb(null, {'method':'getstat', 'error':null, 'start_time':1504683928,
  //   'current_server':'cn1-zcash.flypool.org:3333', 'available_servers':1, 'server_status':2,
  //   'result':[
  //   {'gpuid':0, 'cudaid':0, 'busid':'0000:01:00.0', 'name':'GeForce GTX 1080', 'gpu_status':2, 'solver':0, 'temperature':56, 'gpu_power_usage':153, 'speed_sps':453, 'accepted_shares':685, 'rejected_shares':2, 'start_time':1504683929},
  //   {'gpuid':1, 'cudaid':1, 'busid':'0000:02:00.0', 'name':'GeForce GTX 1080 Ti', 'gpu_status':2, 'solver':0, 'temperature':67, 'gpu_power_usage':197, 'speed_sps':674, 'accepted_shares':1014, 'rejected_shares':0, 'start_time':1504683929},
  //   {'gpuid':2, 'cudaid':2, 'busid':'0000:03:00.0', 'name':'GeForce GTX 1080 Ti', 'gpu_status':2, 'solver':0, 'temperature':67, 'gpu_power_usage':203, 'speed_sps':675, 'accepted_shares':1076, 'rejected_shares':1, 'start_time':1504683930},
  //   {'gpuid':3, 'cudaid':3, 'busid':'0000:07:00.0', 'name':'GeForce GTX 1080 Ti', 'gpu_status':2, 'solver':0, 'temperature':67, 'gpu_power_usage':169, 'speed_sps':682, 'accepted_shares':1071, 'rejected_shares':2, 'start_time':1504683930}]});
  // }
  _getStat(cb) {
    request.get('http://127.0.0.1:42000/getstat', cb);
  }

  getStat(cb) {
    this._getStat((err, stat) => {
      if (err) {
        return cb(err);
      }

      if (stat.error) {
        let error = new Error(JSON.stringify(stat.error));
        return cb(error);
      }

      let gpus = stat.result.map(r => ({
        hashrate: r.speed_sps,
        shares: r.accepted_shares,
      }));
      let newShare = false;
      let totalHashrate = 0;
      if (this.prevStat) {
        let oldShares = 0;
        this.prevStat.forEach(s => {
          oldShares += s.shares;
        });
        let shares = 0;
        gpus.forEach(g => {
          shares += g.shares;
          totalHashrate += g.hashrate;
        });
        if (shares > oldShares) {
          newShare = true;
        }
      } else {
        this.prevStat = gpus;
        newShare = true;
        gpus.forEach(g => {
          totalHashrate += g.hashrate;
        });
      }
      cb(null, {
        newShare,
        gpus,
        hashrate: totalHashrate,
      });
    });
  }
}

module.exports = EWBFMonitor;
