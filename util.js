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

/*
 * get random element from array
 */
function choice(a) {
  return a[Math.floor(Math.random() * a.length)];
}

/**
 * shuffle an array in place.
 */
function shuffle(a) {
    let j, x, i;
    for (let i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

/*
 * count total files we're hosting
 */
async function totalFiles() {
  let r = 0;
  const a = [];
  const contents = await fs.readdirSync(`./${ipfs.host}/`);
  await Promise.all(contents.map(async(content) => {
    const path = `./${ipfs.host}/${content}`;
    if (await fs.statSync(path).isDirectory()) {
      const files = await fs.readdirSync(path);
      r += files.length;
    }
  }));
  return r;
}

module.exports.timeout = timeout;
module.exports.uniquify = uniquify;
module.exports.choice = choice;
module.exports.shuffle = shuffle;
module.exports.totalFiles = totalFiles;
