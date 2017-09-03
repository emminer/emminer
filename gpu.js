const { execFile } = require('child_process');

const query = 'index,gpu_bus_id,name,pstate,power.limit,power.draw,'
+ 'temperature.gpu,fan.speed,clocks.gr,clocks.mem,utilization.gpu';

function parseBusId(raw) {
  return +(raw.match(/^[^:]+:(\d+):/)[1]);
}

function parseLine(data) {
  const arr = data.split(',');
  return {
    index: +(arr[0]),
    pciBusId: parseBusId(arr[1]),
    name: arr[2].trim(),
    pstate: arr[3].trim(),
    powerLimit: +(arr[4]),
    powerDraw: +(arr[5]),
    temp: +(arr[6]),
    fan: +(arr[7]),
    cc: +(arr[8]),
    mc: +(arr[9]),
    utilization: +(arr[10]),
  };
}

module.exports = function(cb) {
  execFile('nvidia-smi', ['--format=csv,noheader,nounits', `--query-gpu=${query}`], (error, stdout, stderr) => {
    if (error) {
      cb(error);
      return;
    }
    if (stderr) {
      cb(new Error(stderr));
      return;
    }
    cb(null, stdout.split('\n').filter(l => (l.indexOf(',') > 0)).map(parseLine));
  });
};
