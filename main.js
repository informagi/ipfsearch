/*
 * prefix [main.js] to all logs
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

log("This is just a short demonstration, that ipfs-http-client works and the cluster is setup correctly.");
log("Arg: " + process.argv[2]);

var ipfsClient = require("ipfs-http-client"); // talking to and through ipfs
//const fs = require("fs"); // file management
//const elasticlunr = require("elasticlunr"); // text search
//var tools = require("./tools"); // list of searches?
var Listener = require('./listener.js'); // listening to requests
var Publisher = require('./publisher.js'); // publishing requests

const host = process.argv[2] || 'ipfs0'; // where ipfs/the api is located
var ipfs = ipfsClient({ host: host, port: '5001', protocol: 'http' });
ipfs.topic = "ipfsearch-v0.1";  // channel where the search happens (tacked onto ipfs to make passing it around easier)
ipfs.Buffer = ipfsClient.Buffer;  // Buffer utility

/*
 * Nice to know infos that test whether the api works
 */
ipfs.swarm.peers(function (err, peerInfos) {
  if (err) { throw err; }
  log("-----------");log("---Peers---");log("-----------");log(peerInfos);
});

ipfs.files.ls(function (err, files) {
  if (err) { throw err; }
  log("-----------");log("---Files---");log("-----------");
  files.forEach((file) => { log(file.name); });
});

ipfs.id(function(err, identity) {
  if (err) { throw err; }
  log("-----------");log("---peerID---");log("------------");log(`${identity.id}`);
});


/*
 * Start the actual search
 */
Listener.listener(ipfs); // start a listener on the network and topic
if (host === 'ipfs0') {
  setTimeout(() => {Publisher.publisher(ipfs)}, 1000); // start the publisher, which sends out queries
}


/*
 * this exitHandler handles what should happen on program.close
 */
async function exitHandler(options, exitCode) {
  if (options.cleanup) {
    ipfs.pubsub.unsubscribe(ipfs.topic, err => {
      if (err) {
        return console.error(`Error: Failed to unsubscribe from ${ipfs.topic}`, err);
      }
    });
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