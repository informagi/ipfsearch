# InterPlanetary Distributed File Search - A Hybrid Self-Organizing Peer-To-Peer Search Architecture
This repository hosts the code which was used for the Master Thesis
_InterPlanetary Distributed File Search - A Hybrid Self-Organizing Peer-To-Peer Search Architecture_ by Mathis Sackers (2019).

You can find the Thesis here (Link will be added once the thesis is done).

We expand on the p2p distributed search engine proposed by
[[Haasdijk, et al. 2019]](https://www.cs.ru.nl/bachelors-theses/2018/Jasper_Haasdijk___4449754___Searching_IPFS.pdf)
and explore ways to reduce strain on the network by introducing topic-sharding.

In this project we test a hybrid approach where users decide for themselves which documents to pin
(classic IPFS) and a system manages additional storage space.
In this [Docker](https://www.docker.com/) stack multiple nodes in a network are simulated and traffic is measured.

## Code Overview
We quickly describe the big-picture lifecycle of this whole repository to give you an idea of what is happening.

### Data
We obtain a (sub-)set of Wikipedia articles and split them into one article per file.
We then shard these articles, by training an LDA model on them, which splits them into a number of topic-shards.
Then the files are distributed to different nodes.

### Node Behaviour
A node first creates search-indices for its files.
One index per topic, as to allow searching in each topic seperately.

For each topic there exists a PubSub channel.
The node subscribes to the topic-channels where it has enough files to meet a certain threshold.

Next the node starts to self-organise some files.
It asks in different channels for files of its 'main' topics (the ones it subscribed to in the preceding step).
It pins and indexes these files.

Then the search can begin.
The node first classifies the query into a topic.
It then searches its local files of that topic.
If the results weren't satisfactory it asks in the channel of that topic.
Now nodes specialising in these topics search their local files and share their results with the querying node.

### Evaluation
After a run we can evaluate how it went.
For this, we can look at how the files were distributed,
how they were then self-organised,
how much traffic was caused
and, of course, how well the search performed.

## Running the Code
For a guide to setting up and running the test environment check out the `Readme.md` inside the [`DockerSetup/`](https://github.com/informagi/ipfsearch/tree/master/DockerSetup) folder.
To get data that the test enviornment can use, check out the `Readme.md` inside the [`Data/`](https://github.com/informagi/ipfsearch/tree/master/Data) folder.
Finally, you can evaluate your test using another of our python scripts.
Check out the `Readme.md` inside the [`Eval/`](https://github.com/informagi/ipfsearch/tree/master/Eval) folder.

## Structure of the Code
In this root folder, we have the javascript application that is run on each node in the network (via [node.js](https://nodejs.org)).
It handles the search and self-organisation of files.
The [`Data/`](https://github.com/informagi/ipfsearch/tree/master/Data) folder holds python scripts to pre-process data
and a `Readme.md` explaining how to use those.
The [`Eval/`](https://github.com/informagi/ipfsearch/tree/master/Eval) folder has python scripts to gather and evaluate statistics after you've run the whole cluster
and a `Readme.md` explaining how to use those.
The [`DockerSetup/`](https://github.com/informagi/ipfsearch/tree/master/DockerSetup) folder has scripts
and snippets to set up the [Docker](https://www.docker.com/)-environment.
Running the scripts inside the [`Data/`](https://github.com/informagi/ipfsearch/tree/master/Data) folder will lead you to create folders called `ipfs0`, `ipfs1`, etc.
These represent (part of) the local filesystem of the nodes in the network.
Namely, they hold the files hosted on ipfs and some additional infos for the search-scripts.
In running the scripts you will also end up with a `node_modules` folder which contains the libraries used by the js-files here.
Now we'll go into detail, what the specific ```\*.js``` files do.

### ```config.js```
A small file that exports a few variables.
Use this to tune the most important behaviors of the search and self-organisation.
Some also provide information to the nodes about the system they are in (e.g. `topics` informs them which topics are available currently).

### ```index.js```
Handles the indices for local search: It builds, saves, loads and deletes the indices.
It also keeps track of which hash belongs to which file.

### ```listener.js```
Subscribes and unsubscribes to/from channels.
Handles incoming messages.

### ```main.js```
Chains everything together.

### ```publisher.js```
Handles pinning and unpinning of files.
Publishes messages to the channels.
Retrieves files from the network.

### ```search.js```
Determines where to search (local or network, which topic) and searches.

### ```selforganise.js```
Manage the self-organised files: Retrieve and delete them.

### ```stats.js```
Exports all statistics.

### ```synchronisation.js```
Keeps the nodes synchronised such that they are in the same phase at all times.

### ```util.js```
Small utility functions.
