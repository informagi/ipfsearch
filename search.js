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
 * loads queries.json file if it exists
 * returns true if it is loaded, false otherwise
 */
async function loadQueries() {
  if (ipfsearch.queries !== undefined) {
    if (ipfsearch.queries === 0) {
      return false;
    }
    return true;
  }
  try {
    await fs.statSync(`./${ipfs.host}/queries.json`);
  } catch (e) {
    ipfsearch.queries = 0;
    return false;
  }
  const queriesFile = await fs.readFileSync(`./${ipfs.host}/queries.json`, 'utf8');
  ipfsearch.queries = JSON.parse(queriesFile);
  return true;
}

/*
 * determine topic of query
 * in practice we have to determine this ourselves
 */
async function getTopic(query) {
  if (await loadQueries()){
    const topic = ipfsearch.queries.topics[query];
    if (topic !== undefined) {
      return topic;
    }
  }
  sLog(`Error: Can't determine topic of ${query}`);
}

/*
 * search in an index
 */
async function searchIndex(topic, query) {
  if (global.indices[topic] === undefined) {
    // we don't have that topic locally
    return [];
  }
  return global.indices[topic].search(query);
}

/*
 * search in the network
 */
async function searchNetwork(topic, query) {
  let ownerId = -1;
  if (ipfsearch.subbedTopics.indexOf(topic) === -1) {
    // sub to the topic
    Listener.sub(topic, 0);
    ownerId = 0;
  } else if (ipfsearch.subOwners[topic] > -1) {
    // sub is temporary; take over ownership
    ownerId = ipfsearch.subOwners[topic] + 1;
    ipfsearch.subOwners[topic] = ownerId;
  }
  // tell listener to catch results
  Listener.listenFor(topic, query);
  // ask the network
  Publisher.pubQuery(topic, query);
  // wait for an answer
  await util.timeout(3000);
  // maybe unsub
  if (ownerId > -1) {
    // we extended the channel-subscription, cancel it
    Listener.unsub(topic, ownerId);
  }
  // gather results
  return Listener.stopListening(topic, query);
}

/*
 * search for a given query
 */
async function search(query, score) {
  sLog(`Searching '${query}' with a minimum score of ${score} ...`);
  // search locally
  const topic = await getTopic(query);
  let results = await searchIndex(topic, query);
  if (results.length > 0 && results[0].score >= score) {
    sLog(`Local results for '${query}' were sufficient.`);
  } else {
    sLog(`Local results for '${query}' insufficient, asking the network ...`);
    results = results.concat(await searchNetwork(topic, query));
  }
  return results;
}

/*
 * some quick testing of our search functionality
 */
async function searchTests() {
  if (!await loadQueries()) {
    return; // no queries to do
  }
  const searches = ipfsearch.queries.queries.map(q => {
    return search(q.q, q.s);
  });
  await Promise.all(searches)
    .then(results => {
      sLog('Searches finished.');
      sLog(results);
    });
}

module.exports.search = search;
module.exports.searchTests = searchTests;
