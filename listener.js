/*
 * prefix [lis..js] to all logs
 */
const llog = function() {
    args = [];
    args.push( '[listener] ' );
    // Note: arguments is part of the prototype
    for( var i = 0; i < arguments.length; i++ ) {
        args.push( arguments[i] );
    }
    console.log.apply( console, args );
};

/*
 * fs.readdir as a promise
 */
function readDirPromise(path) {
  return new Promise((resolve, reject) => {
    fs.readdir(path, (error, fileData) => {
      if (error) {
        reject(error);
      }
      resolve(fileData);
    });
  });
}

/*
 * fs.readFile as a promise
 */
function readFilePromise(file, encoding) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, encoding, (error, fileData) => {
      if (error) {
        reject(error);
      }
      resolve(fileData);
    });
  });
}

/*
 * ipfs-object
 */
class Obj {
  constructor(h, f, d) {
    this.hash = h;
    this.file = f;
    this.data = d;
  }
}

/*
 * called on received messages.
 * Just prints them.
 */
const receiveMsg = msg => {
  const data = JSON.parse(msg.data.toString());
  llog(`I received ${data.event} for: ${data.query}`);
  llog(`The payload is:`);
  llog(data.payload);
};

/*
 * Main function of this file.
 * Invoked from the outside and then listening on standby.
 */
async function listener(ipfs) {
  // subscribe to the topic to be able to receive updates
  ipfs.pubsub.subscribe(ipfs.topic, receiveMsg, err => {
    if (err) {
      return console.error(`Error: Failed to subscribe to ${ipfs.topic}`, err);
    }

    ipfs.id(function(err, identity) {
      if (err) {
        throw err;
      }
      llog(`${identity.id}:`);
      llog(` Listening on channel ${ipfs.topic}`);
    });
  });
}

module.exports.listener = listener;
