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
 * publish a message to network
 */
function pub(channel, event, query, payload) {
  const msgEncoded = ipfs.Buffer.from(JSON.stringify({ event, query, payload }));
  return ipfs.pubsub.publish(channel, msgEncoded)
    .then(() => pLog(`Published ${event} in channel ${channel}`))
    .catch(err => {
      pLog(`Error: Failed to publish ${event} to channel ${channel}`);
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
