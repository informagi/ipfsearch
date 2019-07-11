/*
 * prefix [publishe] to all logs
 */
const pLog = function() {
  args = [];
  args.push('[publishe] ');
  // Note: arguments is part of the prototype
  for(let i = 0; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  console.log.apply(console, args);
};

/*
 * pin file to network
 */
async function pin(filedata) {
  const content = ipfs.Buffer.from(filedata);
  return ipfs.add(content);
}

/*
 * pin all files to the network
 */
async function pinAll() {
  pLog('Pinning all files ...');
  const contents = fs.readdirSync(`./${ipfs.host}/`);
  for (i in contents) {
    const path = `./${ipfs.host}/${contents[i]}`;
    if (fs.statSync(path).isDirectory()) {
      const files = fs.readdirSync(path);
      pLog(`Pinning ${files.length} in ${path}`);
      // only add 200 entries at a time, because the socket might not be able to handle all at once
      for (let i = Math.ceil(files.length/200)-1; i >= 0; i--) {
        await Promise.all(files.slice(i*200, i*200+200).map(async (file) => {
          const filedata = fs.readFileSync(`${path}/${file}`, 'utf8');
          await pin(filedata);
        }));
      }
    }
  }
  pLog('Pinned all files.');
}

/*
 * publish a message to network
 */
function pub(channel, event, query, payload) {
  const msgEncoded = ipfs.Buffer.from(JSON.stringify({ event, query, payload }));
  return ipfs.pubsub.publish(`${ipfsearch.topic}${channel}`, msgEncoded)
    .then(() => pLog(`Published ${event} in channel ${ipfsearch.topic}${channel}`))
    .catch(err => {
      pLog(`Error: Failed to publish ${event} to channel ${ipfsearch.topic}${channel}`);
      pLog(err);
    });
}

/*
 * publish query to network
 */
function pubQuery(topic, query) {
  return pub(topic, 'query', query, '')
}

/*
 * publish answer to network
 */
function pubAnswer(topic, query, results) {
  return pub(topic, 'answer', query, results)
}

/*
 * publish request for files to network
 */
function pubFileReq(topic, request) {
  return pub(topic, 'fileReq', request, '')
}

/*
 * publish response to request for files to network
 */
function pubFileRes(topic, request, results) {
  return pub(topic, 'fileRes', request, results)
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

module.exports.pubQuery = pubQuery;
module.exports.pubAnswer = pubAnswer;
module.exports.pubFileReq = pubFileReq;
module.exports.pubFileRes = pubFileRes;
module.exports.pin = pin;
module.exports.pinAll = pinAll;
