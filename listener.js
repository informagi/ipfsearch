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
    if (err) { return console.error(`Error: Failed to subscribe to ${ipfs.topic}`, err); }
    ipfs.id(function(err, identity) {
      if (err) {
        throw err;
      }
      lLog(`${identity.id}:`);
      lLog(` Listening on channel ${ipfs.topic}`);
    });
  });
}

module.exports.listener = listener;
