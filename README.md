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
