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
  soLog(`Removing ${soDump.docs.length} self-organised files`);
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
    a.push(fs.unlinkSync(d.path));
  });
  a.push(fs.unlinkSync(`./${ipfs.host}/so.json`));
  await Promise.all(a);
  soLog('Removed all self-organised files.');
}

/*
 * pin, index and save new self-organised files
 */
async function addFiles(files, topic) {
  // TODO so.json exists
  const a = files.map(async (file) => {
      const path = await Publisher.get(file.h, `./${ipfs.host}/${topics[0]}/${file.n}`);
      return Index.addToIndex(topics[0], `./${ipfs.host}/${topics[0]}/${file.n}`, file.n);
  });
  // add to so.json
  out = {}
  out.docs = []
  files.forEach((file) => {
    const doc = {'hash': file.h, 'topic': topics[0], 'path': `./${ipfs.host}/${topics[0]}/${file.n}`};
    out.docs.push(doc);
  });
  await fs.writeFileSync(`./${ipfs.host}/so.json`, JSON.stringify(out), (e) => {soLog(e);});
  await Promise.all(a);
}

/*
 * find, pin and index new self-organised files
 */
async function selforganise(topics, addToIndex) {
  // TODO so.json exists
  soLog('Organising some files ...');
  // ask in other topics for files we can additionally host
  let askIn = util.choice(cfg.topics);
  while (askIn == topics[0]) askIn = util.choice(cfg.topics);
  // sub there
  const ownerId = Listener.sub(askIn);
  // Listen for responses and ask
  Listener.listenFor(askIn, topics[0], true);
  Publisher.pubFileReq(askIn, topics[0])
  // wait for an answer
  const t = util.timeout(cfg.fileWait);
  // count local files while waiting
  let totalFiles = await util.totalFiles();
  await t;
  // unsub
  Listener.unsub(askIn, ownerId);
  const newFiles = Listener.stopListening(askIn, topics[0], true);
  // add those new files to ipfs and the index
  newFiles.splice(cfg.soSpace*totalFiles);
  await addFiles(newFiles, topics[0]);
  soLog(`Added ${newFiles.length} new files.`);
}

module.exports.clean = clean;
module.exports.selforganise = selforganise;
