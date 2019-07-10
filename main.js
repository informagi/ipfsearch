/*
 * prefix [--main--] to all logs
 */
const log = function() {
  args = [];
  args.push('[--main--] ');
  // Note: arguments is part of the prototype
  for(let i = 0; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  console.log.apply(console, args);
};

/*
 * Assign variables and constants
 */
// libraries and modules
const ipfsClient = require('ipfs-http-client'); // talking to and through ipfs
global.fs = require('fs');                      // file management
global.elasticlunr = require('elasticlunr');    // text search
const Index = require('./index.js');            // building indices
const Search = require('./search.js');          // searching
global.Listener = require('./listener.js');     // listening to requests
global.Publisher = require('./publisher.js');   // publishing requests
global.cfg = require('./config.js');              // parameters and settings

// ipfs
const host = process.argv[2] || 'ipfs0'; // where ipfs/the api is located
global.ipfs = ipfsClient({ host: host, port: '5001', protocol: 'http' });
ipfs.Buffer = ipfsClient.Buffer;         // Buffer utility
ipfs.host = host;                        // this is us
global.ipfsearch = {};                   // global object with search-related data
ipfsearch.topic = 'ipfsearch-v0.1-';     // prefix for search channels
ipfsearch.subbedTopics = [];             // topics we're subbed to
ipfsearch.subOwners = {};                // keep track of who created a subscription
ipfsearch.watchlist = [];                // the queries we pay attention to
ipfsearch.results = {};                  // results caught while watching

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
 * 'Main' of the program
 */
(async () => {
  // housekeeping
  if (cfg.cleanPins) {await removePins();}
  if (cfg.removeIndex) {
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
  await Index.getIndex();
  // subscribe to the topics we provide search on
  // TODO
  log('Starting Listener');
  await Listener.sub('default');
  // ask in other topics for files we can additionally host
  // TODO ~~ Publisher.askFiles(topic);
  // add those new files to ipfs and the index
  // TODO ~~ Index.addToIndex(new files)
  if (cfg.runQueries) {
    // send out queries to test the system
    setTimeout(() => {Search.searchTests()}, 5000); // Run some testing queries
  } else {
    log('Not running queries, so we\'re pretty much done here.');
  }
})();

/*
 * this exitHandler handles what should happen on program.close
 */
async function exitHandler(options, exitCode) {
  if (options.cleanup) {
    await Listener.unsubAll();
    log('Clean exit. Goodbye.')
    process.exit();
  }
  if (exitCode || exitCode === 0) {
    log(`Received exitcode: ${exitCode}`);
  }
  if (options.exit) {
    log('Exit.');
    process.exit();
  }
}

// do something when app is closing
process.on('exit', exitHandler.bind(null, {}));
// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { cleanup: true }));
// catches 'kill pid' (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {}));
process.on('SIGUSR2', exitHandler.bind(null, {}));
// catches termination (docker-compose down)
process.on('SIGTERM', exitHandler.bind(null, { cleanup: true }));
