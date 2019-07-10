/*
 * prefix [+search+] to all logs
 */
const sLog = function() {
  args = [];
  args.push('[+search+] ');
  // Note: arguments is part of the prototype
  for(let i = 0; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  console.log.apply(console, args);
};


/*
 * search in an index
 */
async function searchIndex(query, topic) {
  return global.indices[topic].search(query);
}

/*
 * search for a given query
 */
async function search(ipfs, query, score) {
  sLog(`Starting search for ${query} ...`);
  // search locally
  // (TODO) ~~ getTopic(query)
  searchIndex()
  // const results = search.search(query, topic)
  if (true) {
    sLog(`Local results scored too low`);
    sLog(`Published a query for '${query}' on the network`);
    pubQuery(topic, query);
  } else {
    sLog(`Local results were sufficient`);
  }
}

/*
 * some quick testing of our search functionality
 */
async function searchTests() {
  // Search different stuff
  // search(topic, "Ant-Man and the Wasp", 2.0);
  // search(topic, "Potatoes", 2.0);
  // await those ^
}

module.exports.search = search;
module.exports.searchTests = searchTests;
