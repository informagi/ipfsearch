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
then the container only includes [`Node.js`](https://nodejs.org/en/) and not the npm package [`ipfs-http-client`](https://github.com/ipfs/js-ipfs-http-client).
You thus need to install it manually.
To do this open a command interface in the root directory of this repository (`../` relative to this file) and run
```bash
npm install
```

This step is not needed when using `node-ipfs:pkg`.

## docker-compose.yml
You can use `generateDockerCompose.py` to generate your `docker-compose.yml`.
It takes a few optional arguments:
Use `-g GO_VERSION` to specify a version for `go-ipfs`.
As mentioned above, the default is `latest`, but we tested it with `v0.4.20`.
`-c CLUSTER_VERSION` can be used to specify another version for `ipfs-cluster`.
We tested `v0.10.1`.
If you want to use `node-ipfs:nopkg`, you have to use `-n`.
If you placed `wait-for` in a folder other than the one where the `docker-compose.yml` will be run,
use `-w WAIT_FOR` to indicate a different path.
(This path also includes the file itself, so `./wait-for` by default)
If the `docker-compose.yml` is not in a folder below the search app,
specify where the search app is located using `-a APP_PATH`.
Try absolute paths if you run into problems.
`-f` replaces an already existing `docker-compose.yml`.
Finally, `-h` shows a help message.

And lastly, the only positional argument at the end indicates how many peers you want in your cluster.

```bash
python generateDockerCompose.py -nf -w ~/wait-for 3
```
would generate a `docker-compose.yml`, even if one already existed, with `node-ipfs:nopkg` and using a `wait-for` from the home directory.
It would include 3 peers.

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
