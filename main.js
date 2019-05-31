console.log("main.js running");
console.log("This is just a short demonstration, that ipfs-http-client works and the cluster is setup correctly.");
console.log("Arg: " + process.argv[2]);

var ipfsClient = require("ipfs-http-client");
if (process.argv[2] !== undefined) {
  var ipfs = ipfsClient({ host: process.argv[2], port: '5001', protocol: 'http' });
} else {
  var ipfs = ipfsClient({ host: 'ipfs0', port: '5001', protocol: 'http' });
}

ipfs.swarm.peers(function (err, peerInfos) {
  if (err) {
    throw err;
  }
  console.log("---Peers---");
  console.log("-----------");
  console.log(peerInfos);
});


ipfs.files.ls(function (err, files) {
  if (err) {
    throw err;
  }
  console.log("---Files---");
  console.log("-----------");
  files.forEach((file) => {
    console.log(file.name);
  });
});

ipfs.id(function(err, identity) {
  if (err) {
    throw err;
  }
  console.log("---peerID---");
  console.log("------------");
  console.log(`${identity.id}`);
});