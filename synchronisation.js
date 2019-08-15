/*
 * prefix [/syncro/] to all logs
 */
const syLog = function() {
  args = [];
  args.push('[/syncro/] ');
  // Note: arguments is part of the prototype
  for(let i = 0; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  console.log.apply(console, args);
};



/*
 * called on received sync messages.
 */
const receiveSyncMsg = async (msg) => {
  const us = await ipfs.id();
  if (msg.from === us.id) {
    return;  // Ignoring our own messages
  }
  const data = JSON.parse(msg.data.toString());
  if (data.event === 'so') {
    if (syn.so.indexOf(msg.from) < 0) {
      syn.so.push(msg.from);
    }
    return;
  }
  if (data.event === 'search') {
    if (syn.search.indexOf(msg.from) < 0) {
      syn.search.push(msg.from);
    }
    return;
  }
  if (data.event === 'exit') {
    if (syn.exit.indexOf(msg.from) < 0) {
      syn.exit.push(msg.from);
    }
    return;
  }
};

/*
 * subscribe to the sync channel
 */
async function subSync() {
  await ipfs.pubsub.subscribe(`${ipfsearch.topic}sync`, receiveSyncMsg)
      .then(() => {
        syLog(`Listening on channel ${ipfsearch.topic}sync`);})
      .catch((err) => {
        syLog(`Error: Failed to subscribe to ${ipfsearch.topic}sync`);
        syLog(err);
      });
}

/*
 * unsubscribe from the sync channel
 */
function unsubSync() {
  return ipfs.pubsub.unsubscribe(`${ipfsearch.topic}sync`)
    .then(() => {
      syLog(`Unsubscibed from channel ${ipfsearch.topic}sync`)})
    .catch(e => { lLog(`Couldn't unsub: ${e}`); });
}



/*
 * tell everyone we're ready for so
 */
async function ready4so() {
  if (syn.so.indexOf("us") < 0) {
    syn.so.push("us");
  }
  // tell the network
  const msgEncoded = ipfs.Buffer.from(JSON.stringify({ "event": "so" }));
  return ipfs.pubsub.publish(`${ipfsearch.topic}sync`, msgEncoded)
    .catch(err => {
      syLog(`Error: Failed to publish ready4so to channel ${ipfsearch.topic}sync`);
      syLog(err);
    });
}


/*
 * tell everyone we're ready for search
 */
async function ready4search() {
  if (syn.search.indexOf("us") < 0) {
    syn.search.push("us");
  }
  // tell the network
  const msgEncoded = ipfs.Buffer.from(JSON.stringify({ "event": "search" }));
  return ipfs.pubsub.publish(`${ipfsearch.topic}sync`, msgEncoded)
    .catch(err => {
      syLog(`Error: Failed to publish ready4search to channel ${ipfsearch.topic}sync`);
      syLog(err);
    });
}

/*
 * tell everyone we're ready for exit
 */
async function ready4exit() {
  if (syn.exit.indexOf("us") < 0) {
    syn.exit.push("us");
  }
  // tell the network
  const msgEncoded = ipfs.Buffer.from(JSON.stringify({ "event": "exit" }));
  return ipfs.pubsub.publish(`${ipfsearch.topic}sync`, msgEncoded)
    .catch(err => {
      syLog(`Error: Failed to publish ready4search to channel ${ipfsearch.topic}sync`);
      syLog(err);
    });
}


/*
 * check if everyone's ready for so
 */
function isReady4so() {
  if (syn.so.length < cfg.numNodes) {
    return false;
  }
  return true;
}


/*
 * check if everyone's ready for search
 */
function isReady4search() {
  if (syn.search.length < cfg.numNodes) {
    return false;
  }
  return true;
}

/*
 * check if everyone's ready for exit
 */
function isReady4exit() {
  if (syn.exit.length < cfg.numNodes) {
    return false;
  }
  return true;
}

module.exports.subSync = subSync;
module.exports.unsubSync = unsubSync;
module.exports.ready4so = ready4so;
module.exports.isReady4so = isReady4so;
module.exports.ready4search = ready4search;
module.exports.isReady4search = isReady4search;
module.exports.ready4exit = ready4exit;
module.exports.isReady4exit = isReady4exit;
