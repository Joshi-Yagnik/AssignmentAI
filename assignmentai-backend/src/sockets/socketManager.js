let ioInstance = null;

module.exports = {
  init: (io) => {
    ioInstance = io;
  },
  getIO: () => {
    return ioInstance; // returns null if not yet initialized
  }
};
