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
  stats.localSearches += 1;
  return global.indices[topic].search(query);
}

/*
 * search in the network
 */
async function searchNetwork(topic, query) {
  stats.onlineSearches += 1;
  const ownerId = Listener.sub(topic);
  // tell listener to catch results
  Listener.listenFor(topic, query);
  // ask the network
  Publisher.pubQuery(topic, query);
  // wait for an answer
  await util.timeout(cfg.searchWait);
  // unsub
  await Listener.unsub(topic, ownerId);
  // gather results
  return Listener.stopListening(topic, query);
}

/*
 * search for a given query
 */
async function search(query, score) {
  sLog(`Searching '${query}' with a minimum score of ${score} ...`);
  stats.queries += 1;
  // search locally
  const topic = await getTopic(query);
  let results = await searchIndex(topic, query);
  if (results.length > 0 && results[0].score >= score) {
    sLog(`Local results for '${query}' were sufficient.`);
  } else {
    const before = results.length;
    sLog(`Local results (${before}) for '${query}' insufficient, asking the network ...`);
    results = results.concat(await searchNetwork(topic, query));
    sLog(`Received ${results.length - before} additional results from the network`);
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
  const searches = ipfsearch.queries.queries.map(async q => {
    const r = await search(q.q, q.s);
    stats.searches.push({'q': q.q, 's': q.s, 'r': r});
    return r;
  });
  await Promise.all(searches)
    .then(results => {
      sLog('Searches finished.');
    });
}

/*
 * determine which channels to join
 */
async function getRelevantTopics() {
  if (cfg.maxChannels < 1) {
    sLog(`Error: maxChannels too low (${cfg.maxChannels})`);
  }
  const contents = await fs.readdirSync(`./${ipfs.host}/`);
  const counts = [];
  await Promise.all(contents.map(async (content) => {
    if (fs.statSync(`./${ipfs.host}/${content}`).isDirectory()) {
      const files = await fs.readdirSync(`./${ipfs.host}/${content}/`);
      counts.push({'t': content, 'c': files.length});
    }
  }));
  let total = 0;
  for (i in counts) {
    total += counts[i].c;
  }
  sLog(`Hosting ${total} files ...`);
  counts.sort((a,b) => {return b.c-a.c});
  const r = [];
  for (i in counts) {
    if (counts[i].c >= total*cfg.topicThreshold) {
      r.push(counts[i].t);
    }
    if (r.length >= cfg.maxChannels) {
      break;
    }
  }
  if (r.length === 0) {
    sLog(`Error: topicThreshold (${cfg.topicThreshold}) not met for any topic.`);
  }
  return r;
}

module.exports.searchIndex = searchIndex;
module.exports.search = search;
module.exports.searchTests = searchTests;
module.exports.getRelevantTopics = getRelevantTopics;
