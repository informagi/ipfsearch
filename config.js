// quick options
module.exports.cleanPins = true;      // clear all the pins on this ipfs node
module.exports.removeIndex = true;    // remove the index.json
module.exports.cleanSO = true;        // clear the self-organised space
module.exports.enableSO = true;       // manage self-organised space
module.exports.runQueries = true;     // search for documents
// parameters
module.exports.numNodes = 5;          // number of nodes in the network
module.exports.topics = [0,1,2,3];    // topics that exist
module.exports.topicThreshold = 0.3;  // topic-files > total*this -> join channel
module.exports.maxChannels = 2;       // maximum channels to permanently join
module.exports.soSpace = 0.2;         // pinned-files*this = self-organised files
module.exports.searchWait = 3000;     // ms to wait for the network to answer a search query
module.exports.fileWait = 8000;       // ms to wait for the network to answer a fileReq
