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
const SO = require('./selforganise.js');        // self-organising
const Sync = require('./synchronisation.js');   // synchronisation
global.Listener = require('./listener.js');     // listening to requests
global.Publisher = require('./publisher.js');   // publishing requests
global.cfg = require('./config.js');            // parameters and settings
global.util = require('./util.js');             // utility functions
const Stats = require('./stats.js');            // exporting stats

// ipfs
const host = process.argv[2] || 'ipfs0'; // where ipfs/the api is located
global.ipfs = ipfsClient({ host: host, port: '5001', protocol: 'http' });
ipfs.Buffer = ipfsClient.Buffer;         // Buffer utility
ipfs.host = host;                        // this is us
global.ipfsearch = {};                   // global object with search-related data
ipfsearch.topic = 'ipfsearch-v0.1-';     // prefix for search channels
ipfsearch.subbedTopics = [];             // topics we're subbed to
ipfsearch.subOwners = {};                // keep track of who created a subscription
ipfsearch.watchlist = {'q': {}, 'f': {}};// the queries we pay attention to
ipfsearch.results = {'q': {}, 'f': {}};  // results caught while watching
ipfsearch.hostedFiles = {};              // files we are hosting

// stats
global.stats = {};                       // global object with stat-related data
stats.soSent = 0;                        // Published so-msgs
stats.soReceived = 0;                    // Received so-msgs
stats.searchSent = 0;                    // Published search-msgs
stats.searchReceived = 0;                // Received search-msgs
stats.droppedMsg = 0;                    // Received and then dropped msgs
stats.queries = 0;                       // Queries we ask
stats.localSearches = 0;                 // Searches on an index
stats.onlineSearches = 0;                // Searches on the network
stats.providedSearches = [];             // Searches we provide on the network
stats.searches = [];                     // searches and their results

// search
global.indices = {};                     // Search indices
global.hashes = {};                      // Hash-Filename pairs

// sync
global.syn = {};                         // used by Sync
global.syn.so = [];                      // who's ready for so
global.syn.search = [];                  // who's ready for search
global.syn.exit = [];                    // who's ready for exit


// used by Listener.receiveMsg
global.searchLocal = Search.searchIndex;
global.offerFiles = SO.filesToOffer;
// used by SO.addFiles
global.filesToIndex = Index.addToIndex;

/*
 * 'Main' of the program
 */
(async () => {
  Sync.subSync();
  // housekeeping
  if (cfg.cleanPins) {await Publisher.unpinAll();}
  if (cfg.cleanPins && !cfg.removeIndex) {await Publisher.pinAll();}
  if (cfg.removeIndex) {await Index.removeIndex();}
  // make sure we can search our own files.
  await Index.getIndex();
  // subscribe to the topics we provide search on
  const subTopics = await Search.getRelevantTopics();
  log(`Subscribing to ${subTopics.length} topic(s) ...`);
  for (i in subTopics) {
    await Listener.sub(subTopics[i]);
  }
  while (!Sync.isReady4so()) {
    Sync.ready4so();
    await util.timeout(5000);
  }
  log('Everyone ready for so.');
  // clear old self-organised files
  if (cfg.cleanSO) {await SO.clean();}
  if (cfg.enableSO) {await SO.selforganise(subTopics, Index.addToIndex);}
  await Index.saveHashes();
  if (cfg.runQueries) {
    while(!Sync.isReady4search()) {
      Sync.ready4search();
      await util.timeout(5000);
    }
    log('Everyone ready for search.');
    // send out queries to test the system
    Search.searchTests()
  } else {
    log('Not running queries, so we\'re pretty much done here.');
  }
  while(!Sync.isReady4exit()) {
      Sync.ready4exit();
      await util.timeout(5000);
    }
  exitHandler({cleanup: true});
})();

/*
 * this exitHandler handles what should happen on program.close
 */
async function exitHandler(options, exitCode) {
  await Stats.saveStats();
  if (options.cleanup) {
    await Listener.unsubAll();
    await Sync.unsubSync();
    log('Clean exit. Goodbye.')
    process.exit();
  }
  if (exitCode || exitCode === 0) {
    await fs.writeFileSync(`./${ipfs.host}/hostedFiles.json`, JSON.stringify(ipfsearch.hostedFiles), (e) => {soLog(e);});
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
