/*
 * Wait for ms
 */
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

module.exports.timeout = timeout;
module.exports.uniquify = uniquify;
