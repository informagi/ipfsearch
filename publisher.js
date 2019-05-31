/*
 * prefix [publisher.js] to all logs
 */
const plog = function() {
    args = [];
    args.push( '[publishe] ' );
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
  plog(`I received ${data.event} for: ${data.query}`);
  plog(`The payload is:`);
  plog(data.payload);
};

/*
 * publish query to network
 */
function publishQuery(ipfs, event, query) {
  var msgObject = { event: event, query: query, payload: ""};
  var msgEncoded = ipfs.Buffer.from(JSON.stringify(msgObject));

  ipfs.pubsub.publish(ipfs.topic, msgEncoded, err => {
    if (err) {
      return console.error(`Error: Failed to publish to ${ipfs.topic}`, err);
    }
  });
}

/*
 * remove duplicates from a list
 */
function uniquify(list) {
  let uniqueArray = list.filter(
    (object, index) =>
      index ===
      list.findIndex(obj => JSON.stringify(obj) === JSON.stringify(object))
  );
  return uniqueArray;
}

/*
 * this functon is the backbone of our application
 * we use this function to search for a given query
 *
 * this function returns the queryhit for the query
 */
function search(ipfs, query, score) {
  plog(`Starting search for ${query} ...`);

  if (true) {
    plog(`Local results scored too low`);
    plog(`Published a query for '${query}' on the network`);
    publishQuery(ipfs, "query", query);
  } else {
    plog(`Local results were sufficient`);
  }
}

/*
 * This function handles some quick testing of our search functionality
 */
function searchTests(ipfs) {
  search(ipfs, "Ant-Man and the Wasp", 2.0);
  search(ipfs, "Potatoes", 2.0);
}

/*
 * Main function of this file.
 * Invoked from the outside.
 */
function publisher(ipfs) {
  searchTests(ipfs);
}

module.exports.publisher = publisher;
