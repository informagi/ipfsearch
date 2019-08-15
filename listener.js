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
const receiveMsg = async (msg) => {
  const us = await ipfs.id();
  if (msg.from === us.id) {
    return;  // Ignoring our own messages
  }
  const data = JSON.parse(msg.data.toString());
  const topic = msg.topicIDs[0].substr(ipfsearch.topic.length);
  if (data.event === 'query') {
    stats.searchReceived += 1;
    if (ipfsearch.subOwners[topic] !== undefined && ipfsearch.subOwners[topic].indexOf(0) > -1) {
      const searchResults = await searchLocal(topic, data.query);
      if (searchResults.length > 0) {
        Publisher.pubAnswer(topic, data.query, searchResults);
      }
    } else {
      stats.droppedMsg += 1;
    }
    return;
  }
  if (data.event === 'answer') {
    stats.searchReceived += 1;
    if (ipfsearch.watchlist.q[topic] !== undefined && ipfsearch.watchlist.q[topic].indexOf(data.query) > -1) {
      let rlist = ipfsearch.results.q;
      rlist[topic][data.query] = util.uniquify(rlist[topic][data.query].concat(data.payload));
    } else {
      stats.droppedMsg += 1;
    }
    return;
  }
  if (data.event === 'fileReq') {
    stats.soReceived += 1;
    if (ipfsearch.subOwners[data.query] === undefined || ipfsearch.subOwners[data.query].indexOf(0) === -1) {
      const files = await offerFiles(data.query);
      if (files.length > 0) {
        Publisher.pubFileRes(topic, data.query, files);
      }
    } else {
      stats.droppedMsg += 1;
    }
    return;
  }
  if (data.event === 'fileRes') {
    stats.soReceived += 1;
    if (ipfsearch.watchlist.f[topic] !== undefined && ipfsearch.watchlist.f[topic].indexOf(data.query) > -1) {
      let rlist = ipfsearch.results.f;
      rlist[topic][data.query] = util.uniquify(rlist[topic][data.query].concat(data.payload));
    } else {
      stats.droppedMsg += 1;
    }
    return;
  }
};

/*
 * subscribe to a topic-channel
 * returns ownerId to keep track of temporary channels
 */
async function sub(topic) {
  topic = String(topic);
  if (ipfsearch.subbedTopics.indexOf(topic) > -1) {
    const tOwners = ipfsearch.subOwners[topic];
    const id = tOwners[tOwners.length - 1] + 1
    tOwners.push(id)
    lLog(`Already listening on channel ${ipfsearch.topic}${topic}, id: ${id}`);
    return id;
  }
  ipfsearch.subbedTopics.push(topic);
  ipfsearch.subOwners[topic] = [0];
  await ipfs.pubsub.subscribe(`${ipfsearch.topic}${topic}`, receiveMsg)
    .then(() => {
      lLog(`Listening on channel ${ipfsearch.topic}${topic}`);})
    .catch((err) => {
      lLog(`Error: Failed to subscribe to ${ipfsearch.topic}${topic}`);
      lLog(err);
    });
  return 0;
}

/*
 * unsubscribe from a topic
 */
function unsub(topic, owner) {
  topic = String(topic);
  const tOwners = ipfsearch.subOwners[topic];
  if (owner === -1) {
    while (tOwners.length > 0) tOwners.pop();
  } else if (tOwners !== undefined && tOwners.indexOf(owner) >= 0) {
    tOwners.splice(tOwners.indexOf(owner), 1);
  }
  if (tOwners !== undefined && tOwners.length < 1 && ipfsearch.subbedTopics.indexOf(topic) >= 0) {
    return ipfs.pubsub.unsubscribe(`${ipfsearch.topic}${topic}`)
      .then(() => {
        ipfsearch.subbedTopics.splice(ipfsearch.subbedTopics.indexOf(topic), 1);
        lLog(`Unsubscibed from channel ${ipfsearch.topic}${topic}`)})
      .catch(e => { lLog(`Couldn't unsub: ${e}`); });
  }
}

/*
 * Unsubscribes from all channels (in the subbedTopics array)
 */
async function unsubAll() {
  lLog('Unsubscribing all channels...');
  await Promise.all(ipfsearch.subbedTopics.map((topic) => { return unsub(topic, -1); }));
  if (ipfsearch.subbedTopics.length === 0) return;
  lLog('Error: Did not unsubscribe from all channels.');
}

module.exports.listenFor = listenFor;
module.exports.stopListening = stopListening;
module.exports.sub = sub;
module.exports.unsub = unsub;
module.exports.unsubAll = unsubAll;
