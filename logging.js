/* eslint no-console: "off" */
module.exports = {
  info() {
    console.log.apply(console, Array.prototype.slice.call(arguments));
  },

  error() {
    console.error.apply(console, Array.prototype.slice.call(arguments));
  }
};
