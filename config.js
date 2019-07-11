// quick options
module.exports.cleanPins = false;     // clear all the pins on this ipfs node
module.exports.removeIndex = false;   // remove the index.json
module.exports.runQueries = false;    // search for documents
module.exports.cleanSO = true;        // clear the self-organised space
module.exports.enableSO = true;       // manage self-organised space
// parameters
module.exports.topics = 4;            // number of topics that exist
module.exports.topicThreshold = 0.3;  // topic-files > total*this -> join channel
module.exports.maxChannels = 2;       // maximum channels to permanently join
module.exports.soSpace = 0.2;         // pinned-files*this = self-organised files
