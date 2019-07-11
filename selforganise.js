/*
 * prefix [~~~SO~~~] to all logs
 */
const soLog = function() {
  args = [];
  args.push('[~~~SO~~~] ');
  // Note: arguments is part of the prototype
  for(let i = 0; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  console.log.apply(console, args);
};

/*
 * unpin, remove from index and delete self-organised files
 */
async function clean() {
  // get files
  try {
    await fs.statSync(`./${ipfs.host}/so.json`);
  } catch (e) {
    return soLog('No self-organised files to clean');
  }
  const soFile = fs.readFileSync(`./${ipfs.host}/so.json`);
  const soDump = JSON.parse(soFile);
  log(`Removing ${soDump.docs.length} self-organised files`);
  const a = [];
  soDump.docs.forEach((d) => {
    // unpin
    a.push(ipfs.pin.rm(d.hash));
    // un-index
    a.push(global.indices[d.topic].removeDocByRef(d.hash));
  });
  await Promise.all(a);
  while (a.length > 0) {a.pop();}
  // delete files
  soDump.docs.forEach((d) => {
    a.push(fs.unlink(d.path));
  });
  a.push(fs.unlink(`./${ipfs.host}/so.json`));
  await Promise.all(a);
  log('Removed all self-organised files.');
}

/*
 * find, pin and index new self-organised files
 */
async function selforganise(topics, addToIndex) {
  // ask in other topics for files we can additionally host
  // TODO ~~ Publisher.askFiles(topic);
  // get files
  // TODO ~~ Publisher.askFiles(topic);
  // add those new files to ipfs and the index
  // TODO ~~ for file in newfile
  // TODO ~~   addToIndex(index, filepath, filename)
  // add to so.json
}

module.exports.clean = clean;
module.exports.selforganise = selforganise;
