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
    // remove from hostedFiles
    a.push(async() => {
      soLog(global.hostedFiles[d.topic].indexOf({'f': d.path.substring(d.path.indexOf(`/${d.topic}/`)+d.topic.length+2), 'h': d.hash}));
      global.hostedFiles[d.topic].splice(global.hostedFiles[d.topic].indexOf({'f': d.path.substring(d.path.indexOf(`/${d.topic}/`)+d.topic.length+2), 'h': d.hash}),1)
    });
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
 * remove files from arr that we already host
 */
async function removeOurs(arr, topic) {
  const ours = [];
  await Promise.all(arr.map(async (el) => {
    try {
      await fs.statSync(`./${ipfs.host}/${topic}/${el.n}`);
      ours.push(el.n);
    } catch (e) { }
    return el;
  }))
  return arr.filter((el) => {
    return ours.indexOf(el.n) === -1;
  });
}

/*
 * pin, index and save new self-organised files
 */
async function addFiles(files, topic) {
  const a = files.map(async (file) => {
    await Publisher.get(file.h, `./${ipfs.host}/${topic}/${file.n}`);
    return filesToIndex(topic, `./${ipfs.host}/${topic}/${file.n}`, file.n);
  });
  // add to so.json
  let out = {};
  try {
    await fs.statSync(`./${ipfs.host}/so.json`);
    out = JSON.parse(await fs.readFileSync(`./${ipfs.host}/so.json`));
  } catch (e) {
    out = {}
    out.docs = []
  }
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
async function selforganise(topics, addToIndex, tries=2) {
  if (tries <= 0) {return;}
  // find out how many files we need
  let neededFiles = 0;
  // count local files
  const totalFiles = await util.totalFiles();
  try {
    await fs.statSync(`./${ipfs.host}/so.json`);
    const saved = JSON.parse(await fs.readFileSync(`./${ipfs.host}/so.json`));
    neededFiles = cfg.soSpace * (totalFiles - saved.docs.length);
    neededFiles -= saved.docs.length;
  } catch (e) {
    neededFiles = cfg.soSpace * totalFiles;
  }
  neededFiles = Math.floor(neededFiles);
  if (neededFiles <= 0) {
    return soLog('Nothing to self-organise.');
  }
  soLog(`Organising ${neededFiles} files ...`);
  // ask in other topics for files we can additionally host
  let askIn = util.choice(cfg.topics);
  while (askIn == topics[0]) askIn = util.choice(cfg.topics);
  // sub there
  const ownerId = await Listener.sub(askIn);
  // Listen for responses and ask
  await Listener.listenFor(askIn, topics[0], true);
  await Publisher.pubFileReq(askIn, topics[0])
  // wait for an answer
  await util.timeout(cfg.fileWait);
  // unsub
  await Listener.unsub(askIn, ownerId);
  let newFiles = Listener.stopListening(askIn, topics[0], true);
  // remove files we already have
  newFiles = await removeOurs(newFiles, topics[0]);
  // add those new files to ipfs and the index
  util.shuffle(newFiles);
  // only add up to the maximum
  newFiles.splice(neededFiles);
  await addFiles(newFiles, topics[0]);
  soLog(`Added ${newFiles.length} new files.`);
  // not enough files added
  if (newFiles.length < neededFiles) {
    await selforganise(topics, addToIndex, tries-1);
  }
}

/*
 * find files to offer to other nodes
 */
async function filesToOffer(topic) {
  topic = String(topic);
  if (global.ipfsearch.hostedFiles[topic] !== undefined) {
    return global.ipfsearch.hostedFiles[topic];
  }
  return [];
}

module.exports.clean = clean;
module.exports.selforganise = selforganise;
module.exports.filesToOffer = filesToOffer;
