const { Duplex, Readable } = require('stream');

const createReadMethod = (entry, state) => function() {
  if (state.alreadyRead < entry.available) {
    const { readableHighWaterMark } = this;
    const chunkSize = Math.min(readableHighWaterMark, entry.available - state.alreadyRead);
    const chunk = entry.buffer.slice(state.alreadyRead, state.alreadyRead + chunkSize);
    this.push(Buffer.from(chunk));
    state.alreadyRead += chunkSize;
    if (state.readAttempts > 0) state.readAttempts--;
  } else if (entry.complete) {
    this.push(null);
  } else {
    state.readAttempts++;
  }
};

const streamBufferCache = Cls => class extends Cls {
  set(key) {
    const state = {
      alreadyRead: 0,
      readAttempts: 0,
    };

    const entry = {
      available: 0,
      buffer: [],
      complete: false,
      stream: new Duplex({
        write(chunk, encoding, cb) {
          const { byteLength } = chunk;
          for (const b of chunk) entry.buffer.push(b);
          entry.available += byteLength;
          if (state.readAttempts > 0) {
            entry.stream.push(chunk);
            state.alreadyRead += byteLength;
            state.readAttempts--;
          }
          return cb();
        },
      }),
    };

    entry.stream['_read'] = createReadMethod(entry, state);

    entry.stream.on('error', () => {
      this.delete(key);
      process.nextTick(() => entry.stream.removeAllListeners());
    });

    entry.stream.once('finish', () => {
      if (state.readAttempts > 0) entry.stream.push(null);
      entry.complete = true;
    });

    super.set(key, entry);

    return entry.stream;
  }

  get(key) {
    const entry = super.get(key);
    if (!entry) return undefined;

    const state = {
      alreadyRead: 0,
      readAttempts: 0,
    };

    const stream = new Readable;

    stream['_read'] = createReadMethod(entry, state);

    if (!entry.complete) {
      const onData = chunk => {
        if (state.readAttempts > 0) {
          stream.push(chunk);
          state.alreadyRead += chunk.byteLength;
          state.readAttempts--;
        }
      };
      const onError = err => {
        stream.emit('error', err);
      };

      entry.stream.on('data', onData);

      entry.stream.on('error', onError);

      entry.stream.once('finish', () => {
        if (state.readAttempts > 0) stream.push(null);

        entry.stream.off('data', onData);
        entry.stream.off('error', onError);
      });
    }

    return stream;
  }
};

module.exports = streamBufferCache;
