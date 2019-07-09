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
 * Main function of this file.
 * Invoked from the outside and then listening on standby.
 */
async function listener() {
  // subscribe to the topic to be able to receive updates
  ipfs.pubsub.subscribe(ipfs.topic, receiveMsg, err => {
    if (err) { return lLog(`Error: Failed to subscribe to ${ipfs.topic}`, err); }
    ipfs.subbedTopics.push(ipfs.topic);
    lLog(`Listening on channel ${ipfs.topic}`);
  });
}


/*
 * Unsubscribes from all channels (in the subbedTopics array)
 */
async function unsubscribeAll() {
  const tmp = ipfs.subbedTopics.slice();
  tmp.push('invalid')
  ipfs.subbedTopics = [];
  await Promise.all(tmp.map((topic) => {
    return ipfs.pubsub.unsubscribe(topic)
      .then(() => {lLog(`Unsubscibed from channel ${topic}`)})
      .catch(e => {
        lLog(`Error: ${e}`);
        ipfs.subbedTopics.push(topic)});
  }));
  if (ipfs.subbedTopics.length === 0) return;
  lLog('Error: Did not unsubscribe from all channels.');
}

module.exports.listener = listener;
module.exports.unsubscribeAll = unsubscribeAll;
