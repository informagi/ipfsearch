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
    await Publisher.get(file.h, `./${ipfs.host}/${topic}/${file.n}`);
    return filesToIndex(indices[topic], `./${ipfs.host}/${topic}/${file.n}`, file.n);
  });
  // add to so.json
  out = {}
  out.docs = []
  files.forEach((file) => {
    const doc = {'hash': file.h, 'topic': topic, 'path': `./${ipfs.host}/${topic}/${file.n}`};
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
  const ownerId = await Listener.sub(askIn);
  // Listen for responses and ask
  await Listener.listenFor(askIn, topics[0], true);
  await Publisher.pubFileReq(askIn, topics[0])
  // wait for an answer
  const t = util.timeout(cfg.fileWait);
  // count local files while waiting
  const totalFiles = await util.totalFiles();
  await t;
  // unsub
  Listener.unsub(askIn, ownerId);
  const newFiles = Listener.stopListening(askIn, topics[0], true);
  // add those new files to ipfs and the index
  // TODO ~~ shuffle(newFiles)
  // only add up to the maximum
  newFiles.splice(cfg.soSpace*totalFiles);
  await addFiles(newFiles, topics[0]);
  soLog(`Added ${newFiles.length} new files.`);
  // TODO ~~ added not enough files
}

/*
 * find files to offer to other nodes
 */
async function filesToOffer(topic) {
  const path = `./${ipfs.host}/${topic}`;
  // if path exists
  try {
    fs.statSync(path);
  } catch (e) {return [];}
  const files = fs.readdirSync(path);
  return Promise.all(files.map(async (file) => {
    const n = file;
    const filedata = fs.readFileSync(`${path}/${file}`, 'utf8');
    const h = await Publisher.hash(filedata);
    return {h, n}
  }));
}

module.exports.clean = clean;
module.exports.selforganise = selforganise;
module.exports.filesToOffer = filesToOffer;
