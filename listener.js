/*
 * prefix [listener] to all logs
 */
const lLog = function() {
    args = [];
    args.push( '[listener] ' );
    // Note: arguments is part of the prototype
    for( var i = 0; i < arguments.length; i++ ) {
        args.push( arguments[i] );
    }
    console.log.apply( console, args );
};

/*
 * called on received messages.
 * Just prints them.
 */
const receiveMsg = msg => {
  const data = JSON.parse(msg.data.toString());
  lLog(`I received ${data.event} for: ${data.query}`);
  lLog(`The payload is:`);
  lLog(data.payload);
};

/*
 * subscribe to a topic
 */
function sub(topic) {
  return ipfs.pubsub.subscribe(topic, receiveMsg)
    .then(() => {
      ipfs.subbedTopics.push(topic);
      lLog(`Listening on channel ${topic}`);})
    .catch((err) => {
      lLog(`Error: Failed to subscribe to ${ipfs.topic}`);
      lLog(err);
    });
}

/*
 * unsubscribe from a topic
 */
function unsub(topic) {
  return ipfs.pubsub.unsubscribe(topic)
    .then(() => {
      const i = ipfs.subbedTopics.indexOf(topic);
      if (i > -1) {
        ipfs.subbedTopics.splice(i, 1);
      }
      lLog(`Unsubscibed from channel ${topic}`)})
    .catch(e => { lLog(`Error: ${e}`); });
}

/*
 * Unsubscribes from all channels (in the subbedTopics array)
 */
async function unsubAll() {
  await Promise.all(ipfs.subbedTopics.map((topic) => { return unsub(topic); }));
  if (ipfs.subbedTopics.length === 0) return;
  lLog('Error: Did not unsubscribe from all channels.');
}

module.exports.sub = sub;
module.exports.unsub = unsub;
module.exports.unsubAll = unsubAll;
