# InterPlanetary File Search - A hybrid self-organizing p2p search
This repository hosts the code which was used for the Master Thesis
_InterPlanetary File Search - A hybrid self-organizing p2p search_ by Mathis Sackers (2019).

You can find the Thesis here (Link will be added once the thesis is done).

We expand on the p2p distributed search engine proposed by
[[Haasdijk, et al. 2019]](https://www.cs.ru.nl/bachelors-theses/2018/Jasper_Haasdijk___4449754___Searching_IPFS.pdf)
and explore ways to reduce strain on the network by introducing topic-sharding.

In this project we test a hybrid approach where users decide for themselves which documents to pin
(classic IPFS) and a system manages additional storage space.
In this [Docker](https://www.docker.com/) stack multiple nodes in a network are simulated and traffic is measured.

## Running the code
For a guide to setting up and running the test environment check out the `Readme.md` inside the [`DockerSetup/`](https://github.com/informagi/ipfsearch/tree/master/DockerSetup) folder.
To get data that the test enviornment can use, check out the `Readme.md` inside the [`Data/`](https://github.com/informagi/ipfsearch/tree/master/Data) folder.

## Structure of the code
In this root folder, we have the javascript application that is run on each node in the network (via [node.js](https://nodejs.org)).
It handles the search and self-organisation of files.
The [`Data/`](https://github.com/informagi/ipfsearch/tree/master/Data) folder holds python scripts to pre-process data
and a `Readme.md` explaining how to use those.
The [`DockerSetup/`](https://github.com/informagi/ipfsearch/tree/master/DockerSetup) folder has scripts
and snippets to set up the [Docker](https://www.docker.com/)-environment.
Running the scripts inside the [`Data/`](https://github.com/informagi/ipfsearch/tree/master/Data) folder will lead you to create folders called `ipfs0`, `ipfs1`, etc.
These represent (part of) the local filesystem of the nodes in the network.
Namely, they hold the files hosted on ipfs and some additional infos for the search-scripts.
In running the scripts you will also end up with a `node_modules` folder which contains the libraries used by the js-files here.
Now I'll go into detail, what the specific \*.js files do.

### config.js
A small file that exports a few variables.
Use this to tune the most important behaviors of the search and self-organisation.
Some also provide information to the nodes about the system they are in (`topics` informs them which topics are available currently).

### index.js
Handles the indices for local search: It builds, saves, loads and deletes the indices.

### listener.js
Subscribes and unsubscribes to/from channels.
Handles incoming messages.

### main.js
Chains everything together.

### publisher.js
Handles pinning and unpinning of files.
Publishes messages to the channels.
Retrieves files from the network.

### search.js
Determines where to search (local or network, which topic) and searches.

### selforganise.js
Manage the self-organised files: Retrieve and delete them.

### util.js
Small utility functions.
