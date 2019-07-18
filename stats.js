/*
 * gather and export all stats
 */
async function saveStats() {
  // count local files
  const totalFiles = await util.totalFiles();
  try {
    await fs.statSync(`./${ipfs.host}/so.json`);
    const so = JSON.parse(await fs.readFileSync(`./${ipfs.host}/so.json`));
    stats.soFiles = so.docs.length;
    stats.pinFiles = totalFiles - so.docs.length;
  } catch (e) {
    stats.soFiles = 0;
    stats.pinFiles = totalFiles;
  }
  // write to disk
  await fs.writeFileSync(`./${ipfs.host}/stats.json`, JSON.stringify(stats), (e) => {console.log('[:Stats::]', e);});
}

module.exports.saveStats = saveStats;
