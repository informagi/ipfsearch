// quick options
module.exports.cleanPins = false;     // clear all the pins on this ipfs node
module.exports.removeIndex = false;   // remove the index.json
module.exports.runQueries = false;    // search for documents
// parameters
module.exports.topicThreshold = 0.3;  // topic-files > total*this -> join channel
module.exports.maxChannels = 2;       // maximum channels to permanently join
module.exports.soSpace = 0.5;         // pinned-files*this = self-organized files
