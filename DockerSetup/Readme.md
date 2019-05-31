# Reproducing our work

Here we lay out the steps necessary to reproduce our work.
Before we start you need to download [`wait-for`](https://github.com/Eficode/wait-for) and place it in this folder.
It's used while building `Node-IPFS`, as well as in the `docker-compose.yml`.

## Docker images

Let's start with the docker images that you'll need.

### Go-IPFS
We use the official docker images provided by the ipfs-team.
That's `ipfs/go-ipfs:latest` from Dockerhub.
We tested our code with version `ipfs/go-ipfs:v0.4.20`.
This means you don't need to build it yourself as it will automatically be downloaded in the final step.

### IPFS-Cluster

Here too, we use the official image `ipfs/ipfs-cluster:latest`.
(Tested with `ipfs/ipfs-cluster:v0.10.1`)

### Node-IPFS
This one we build ourselves.
In this folder you can find two versions of Node-IPFS.
One that already includes the npm package `ipfs-http-client` (`NodePkgDockerfile.sh`) and one that does not (`NodeNoPkgDockerfile.sh`).
Choose one, rename it to `Dockerfile` (No file extension) and build it by running
```bash
docker build -t node-ipfs:pkg .
```
(replace `node-ipfs:pkg` with `node-ipfs:nopkg` when building `NodeNoPkgDockerfile.sh`)

#### ipfs-http-client
If you are using `node-ipfs:nopkg` (built from `NodeNoPkgDockerfile.sh`),
then the container only includes [`Node.js`](https://nodejs.org/en/) and not the npm package [ipfs-http-client](https://github.com/ipfs/js-ipfs-http-client).
You thus need to install it manually.
To do this open a command interface in the root directory of this repository (`../` relative to this file) and run
```bash
npm install
```

This step is not needed when using `node-ipfs:pkg`

## docker-compose.yml
Although we provide a `docker-compose.yml` you might have to slightly adjust it.
In *line 23* you might need to adjust the version of `go-ipfs` as mentioned above.
Similarly, you might adjust the version of `ipfs-cluster` in *line 30*.

In *line 57* choose `node-ipfs:pkg` or `node-ipfs:nopkg` depending on which you built/want to use.

You might need to adjust the path to `wait-for` in *line 42* and/or
the path to the root folder of this repo (`../` relative to this file) in *line 64*.
Try absolute paths if you run into problems.

## Adding more peers
🚧This section is under construction.🚧

## Running the whole thing
Before running the stack it is a good idea to generate a cluster secret.
To do that, run - inside the command interface you will use to start the stack - the command
```bash
export CLUSTER_SECRET=$(od  -vN 32 -An -tx1 /dev/urandom | tr -d ' \n')
```
Then just run
```bash
docker-compose up
```
and the containers are started.
