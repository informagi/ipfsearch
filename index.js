/*
 * prefix [.index..] to all logs
 */
const iLog = function() {
  args = [];
  args.push('[.index..] ');
  // Note: arguments is part of the prototype
  for(let i = 0; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  console.log.apply(console, args);
};

/*
 * class similar to ipfs-object that gets saved into index
 */
class Obj {
  constructor(h, f, d) {
    this.hash = h;
    this.file = f;
    this.data = d;
  }
}

/*
 * creates an empty index.
 */
function createIndex() {
  var index = elasticlunr(function() {
    this.addField('file');
    this.addField('data');
    this.setRef('hash');
    this.saveDocument(false);
  });
  /*
   * We dont need to store the original JSON document. This reduces the index
   * size and we can already refer to the document by its hash (content
   * addressed)
   */
  return index;
}

/*
 * adds file to elasticlunr index and ipfs
 */
async function addToIndex(index, filepath, filename) {
  try {
    // add file to ipfs, bad practice, should not be in this file :(
    const filedata = fs.readFileSync(filepath, 'utf8');
    const content = ipfs.Buffer.from(filedata);
    const results = await ipfs.add(content);
    const hash = results[0].hash;
    // put object into index
    const obj = new Obj(hash, filename, filedata);
    index.addDoc(obj);
    elasticlunr.clearStopWords(); // remove default English stop words
  } catch (error) {
    iLog(`Error : File ${filename} has not been added to the index`);
    iLog(`Reason: ${error}`);
  }
  return index;
}

/*
 * saves an index to a file
 */
async function saveIndex(index, path) {
  iLog(`Saving index${path.substr(path.indexOf('x') + 1, path.length - path.indexOf('j')-2)} to disk.`);
  fs.writeFileSync(path, JSON.stringify(index), function(error) {
    if (error) { iLog(error); }
  });
}

/*
 * calls addToIndex on all files in a folder
 */
async function readFilesIntoObjects(index, path) {
  const files = fs.readdirSync(path);
  // only add 200 entries at a time, because the socket might not be able to handle all at once
  for (let i = Math.ceil(files.length/200)-1; i >= 0; i--) {
    await Promise.all(files.slice(i*200, i*200+200).map(file => addToIndex(index, `${path}/${file}`, file)));
  }
}

/*
 * load previous indices or generate and save new ones.
 */
async function getIndex() {
  const contents = fs.readdirSync(`./${ipfs.host}/`);
  iLog('Trying to load indices from local files ...');
  for (i in contents) {
    if (contents[i][0] === 'i' && !fs.statSync(`./${ipfs.host}/${contents[i]}`).isDirectory()) {
      const indexFile = fs.readFileSync(`./${ipfs.host}/${contents[i]}`);
      const indexDump = JSON.parse(indexFile);
      global.indices[contents[i].substr(5,contents[i].length-10)] = elasticlunr.Index.load(indexDump);
    }
  }
  if (global.indices.length < contents.length/2) {
    // file does not exist, create fresh index
    iLog('No local indices exist, generating new index files ...');
    const contents = fs.readdirSync(`./${ipfs.host}/`);
    for (i in contents) {
      if (fs.statSync(`./${ipfs.host}/${contents[i]}`).isDirectory()) {
        global.indices[contents[i]] = createIndex();
        await readFilesIntoObjects(global.indices[contents[i]], `./${ipfs.host}/${contents[i]}`);
        // save the index
        await saveIndex(global.indices[contents[i]], `./${ipfs.host}/index${contents[i]}.json`);
      }
    }
  }
}

module.exports.getIndex = getIndex;
