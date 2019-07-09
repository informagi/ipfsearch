/*
 * prefix [--main--] to all logs
 */
const log = function() {
    args = [];
    args.push( '[--main--] ' );
    // Note: arguments is part of the prototype
    for( var i = 0; i < arguments.length; i++ ) {
        args.push( arguments[i] );
    }
    console.log.apply( console, args );
};


/*
 * Assign variables and constants
 */
// quick options
const cleanPins = false;   // clear all the pins on this ipfs node
const removeIndex = false; // remove the index.json
const runQueries = false;  // search for documents

// libraries and modules
const ipfsClient = require("ipfs-http-client"); // talking to and through ipfs
global.fs = require("fs");                      // file management
global.elasticlunr = require("elasticlunr");    // text search
const Search = require('./search.js');          // building and searching indices
const Listener = require('./listener.js');      // listening to requests
const Publisher = require('./publisher.js');    // publishing requests

// ipfs
const host = process.argv[2] || 'ipfs0'; // where ipfs/the api is located
global.ipfs = ipfsClient({ host: host, port: '5001', protocol: 'http' });
ipfs.Buffer = ipfsClient.Buffer;  // Buffer utility
// ipfs-related stuff tacked on to make it available everywhere (a bit of a bad practice)
ipfs.topic = "ipfsearch-v0.1-t";  // prefix for search channels
ipfs.subbedTopics = [];  // topics we're subbed to
ipfs.host = host;  // attach host so we have it available globally

// search
global.indices = {};


/*
 * Remove all pins
 */
async function removePins() {
  await ipfs.pin.ls()
    .then(async (pinset) => {
      if (pinset.length > 0) {
        log(`Removing pinset of length ${pinset.length}`);
        const a = [];
        pinset.forEach((p) => {
          if (p.type != 'indirect') {
            a.push(ipfs.pin.rm(p.hash));
          }
        });
        await Promise.all(a);
      }
    })
    .catch((err) => {log(err);});
  log('Removed pinset.');
}


/*
 * "Main" of the program
 */
(async () => {
  // housekeeping
  if (cleanPins) {await removePins();}
  if (removeIndex) {
    log('Deleting Index files.');
    try {
      const contents = fs.readdirSync(`./${ipfs.host}/`);
      for (i in contents) {
        if (await !fs.statSync(`./${ipfs.host}/${contents[i]}`).isDirectory()) {
          await fs.unlinkSync(`./${ipfs.host}/${contents[i]}`);
        }
      }
    } catch(e) { log(e); }
  }
  // make sure we can search our own files.
  await Search.getIndex();
  // subscribe to the topics we provide search on
  log('Starting Listener');
  Listener.listener();
  // ask in other topics for files we can additionally host
  // TODO ~~ Publisher.askFiles(topic);
  // add those new files to ipfs and the index
  // TODO ~~ Search.addIndex(new files)
  if (runQueries && host === 'ipfs0') {
    // send out queries to test the system
    setTimeout(() => {Publisher.publisher()}, 1000); // start the publisher, which sends out queries
  } else {
    // ...
  }
})();

/*
 * this exitHandler handles what should happen on program.close
 */
async function exitHandler(options, exitCode) {
  if (options.cleanup) {
    await Listener.unsubscribeAll();
    log("Clean exit. Goodbye.")
    process.exit();
  }
  if (exitCode || exitCode === 0) {
    log(`Received exitcode: ${exitCode}`);
  }
  if (options.exit) {
    log("Exit.");
    process.exit();
  }
}

// do something when app is closing
process.on("exit", exitHandler.bind(null, {}));
// catches ctrl+c event
process.on("SIGINT", exitHandler.bind(null, { cleanup: true }));
// catches "kill pid" (for example: nodemon restart)
process.on("SIGUSR1", exitHandler.bind(null, {}));
process.on("SIGUSR2", exitHandler.bind(null, {}));
// catches termination (docker-compose down)
process.on("SIGTERM", exitHandler.bind(null, { cleanup: true }));