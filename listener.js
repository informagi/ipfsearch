/*
 * prefix [listener] to all logs
 */
const llog = function() {
    args = [];
    args.push( '[listener] ' );
    // Note: arguments is part of the prototype
    for( var i = 0; i < arguments.length; i++ ) {
        args.push( arguments[i] );
    }
    console.log.apply( console, args );
};

/*
 * ipfs-object
 */
class Obj {
  constructor(h, f, d) {
    this.hash = h;
    this.file = f;
    this.data = d;
  }
}

/*
 * 
 */
function createIndex() {
  var index = elasticlunr(function() {
    this.addField("file");
    this.addField("data");
    this.setRef("hash");
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
    const filedata = fs.readFileSync(filepath, "utf8");
    const content = ipfs.Buffer.from(filedata);
    const results = await ipfs.add(content);
    const hash = results[0].hash;

    const obj = new Obj(hash, filename, filedata);
    index.addDoc(obj);

    elasticlunr.clearStopWords(); // remove default English stop words
  } catch (error) {
    llog(`Error : File ${filename} has not been added to the index`);
    llog(`Reason: ${error}`);
  }

  return index;
}


async function saveIndex(index, path) {  /// TODO
  llog(`Saving index${path.substr(path.indexOf('x') + 1, path.length - path.indexOf('j')-2)} to disk.`);
  fs.writeFileSync(path, JSON.stringify(index), function(error) {
    if (error) { llog(error); }
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
 * called on received messages.
 * Just prints them.
 */
const receiveMsg = msg => {
  const data = JSON.parse(msg.data.toString());
  llog(`I received ${data.event} for: ${data.query}`);
  llog(`The payload is:`);
  llog(data.payload);
};

/*
 * Main function of this file.
 * Invoked from the outside and then listening on standby.
 */
async function listener() {
  try {
    const stats = fs.statSync(`./${ipfs.host}/index0.json`); // one index exists
    // file exists, load index from file
    llog("Loading indices from local files ...");
    const contents = fs.readdirSync(`./${ipfs.host}/`);
    for (i in contents) {
      if (!fs.statSync(`./${ipfs.host}/${contents[i]}`).isDirectory()) {
        const indexFile = fs.readFileSync(`./${ipfs.host}/${contents[i]}`);
        const indexDump = JSON.parse(indexFile);
        global.indices[contents[i].substr(5,contents[i].length-10)] = elasticlunr.Index.load(indexDump);
      }
    }
  } catch (error) {
    // file does not exist, create fresh index
    llog("Generating new index files ...");
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

  // subscribe to the topic to be able to receive updates
  ipfs.pubsub.subscribe(ipfs.topic, receiveMsg, err => {
    if (err) { return console.error(`Error: Failed to subscribe to ${ipfs.topic}`, err); }

    ipfs.id(function(err, identity) {
      if (err) {
        throw err;
      }
      llog(`${identity.id}:`);
      llog(` Listening on channel ${ipfs.topic}`);
    });
  });
}

module.exports.listener = listener;
