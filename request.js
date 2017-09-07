const request = require('request');

function post(url, token, worker, payload, cb) {
  request.post({
    url,
    headers: {
      'MINER_TOKEN': token,
      'MINER_WORKER': worker,
    },
    body: payload,
    json: true,
  }, (err, response, body) => {
    if (err) {
      cb(err);
      return;
    }
    if (response.statusCode !== 200 && response.statusCode !== 201) {
      cb(new Error(`http error, code: ${response.statusCode}`));
      return;
    }

    cb(null, body);
  });
}

function get(url, cb) {
  request.get({url, json: true}, (err, response, body) => {
    if (err) {
      return cb && cb(err);
    }

    if (response.statusCode !== 200) {
      return cb && cb(new Error(`http error, code: ${response.statusCode}`));
    }

    cb(null, body);
  });
}

module.exports = { post, get };
