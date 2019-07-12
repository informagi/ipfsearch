/*
 * prefix [listener] to all logs
 */
const lLog = function() {
  args = [];
  args.push('[listener] ');
  // Note: arguments is part of the prototype
  for(let i = 0; i < arguments.length; i++) {
    args.push( arguments[i] );
  }
  console.log.apply(console, args);
};

/*
 * start keeping track of a specific query (or fileReq)
 */
function listenFor(topic, query, fileReq=false) {
  let list = ipfsearch.watchlist.q;
  let rlist = ipfsearch.results.q;
  if (fileReq) {
    list = ipfsearch.watchlist.f;
    rlist = ipfsearch.results.f;
  }
  if (list[topic] === undefined) {
    list[topic] = [];
  }
  if (list[topic].indexOf(query) > -1) {
    return lLog(`Error: Already listening for ${query} on ${ipfsearch.topic}${topic}`);
  }
  // add to watchlist
  list[topic].push(query);
  if (rlist[topic] === undefined) {
    rlist[topic] = {};
  }
  rlist[topic][query] = [];
}

/*
 * stop keeping track of a specific query (or fileReq)
 */
function stopListening(topic, query, fileReq=false) {
  let list = ipfsearch.watchlist.q;
  let rlist = ipfsearch.results.q;
  if (fileReq) {
    list = ipfsearch.watchlist.f;
    rlist = ipfsearch.results.f;
  }
  // remove from watchlist
  list[topic].splice(list[topic].indexOf(query), 1);
  // return caught messages
  const r = rlist[topic][query].slice();
  rlist[topic][query] = undefined;
  return r
}

/*
 * called on received messages.
 * Just prints them.
 */
const receiveMsg = msg => {
  const data = JSON.parse(msg.data.toString());
  // TODO
  lLog(`I received ${data.event} for: ${data.query}`);
  // lLog(`The payload is:`);
  // lLog(data.payload);
};

/*
 * subscribe to a topic-channel (owner id to keep track of temporary channels)
 */
function sub(topic, owner=-1) {
  return ipfs.pubsub.subscribe(`${ipfsearch.topic}${topic}`, receiveMsg)
    .then(() => {
      ipfsearch.subbedTopics.push(topic);
      ipfsearch.subOwners[topic] = owner;
      lLog(`Listening on channel ${ipfsearch.topic}${topic}`);})
    .catch((err) => {
      lLog(`Error: Failed to subscribe to ${ipfsearch.topic}${topic}`);
      lLog(err);
    });
}

/*
 * unsubscribe from a topic
 */
function unsub(topic, owner=-1) {
  if (ipfsearch.subOwners[topic] === owner) {
    return ipfs.pubsub.unsubscribe(`${ipfsearch.topic}${topic}`)
      .then(() => {
        const i = ipfsearch.subbedTopics.indexOf(topic);
        if (i > -1) {
          ipfsearch.subbedTopics.splice(i, 1);
        }
        lLog(`Unsubscibed from channel ${ipfsearch.topic}${topic}`)})
      .catch(e => { lLog(`Error: ${e}`); });
  }
}

/*
 * Unsubscribes from all channels (in the subbedTopics array)
 */
async function unsubAll() {
  await Promise.all(ipfsearch.subbedTopics.map((topic) => { return unsub(topic); }));
  if (ipfsearch.subbedTopics.length === 0) return;
  lLog('Error: Did not unsubscribe from all channels.');
}

module.exports.listenFor = listenFor;
module.exports.stopListening = stopListening;
module.exports.sub = sub;
module.exports.unsub = unsub;
module.exports.unsubAll = unsubAll;
