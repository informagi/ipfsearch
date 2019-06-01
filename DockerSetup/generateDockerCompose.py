import argparse
import os
import sys

# Arguments
parser = argparse.ArgumentParser(description="generate a docker-compose.yml for ipfsearch.")
parser.add_argument("-g", "--go-version", default="latest",
                    help="the version to use for go-ipfs (ipfs/go-ipfs:GO_VERSION), default: latest")
parser.add_argument("-c", "--cluster-version", default="latest",
                    help="the version to use for ipfs-cluster (ipfs/ipfs-cluster:CLUSTER_VERSION), default: latest")
parser.add_argument("-n", "--nopkg", action="store_true",
                    help="use node-ipfs:nopkg instead of node-ipfs:pkg")
parser.add_argument("-w", "--wait-for", default="./wait-for",
                    help="path to wait-for, default: ./wait-for")
parser.add_argument("-a", "--app-path", default="../",
                    help="path to ipfsearch, default: ../")
parser.add_argument("-f", "--force", action="store_true",
                    help="replace already existing docker-compose.yml")
parser.add_argument("peers", type=int, nargs='?', default=1,
                    help="the number of peers in the network")
args = parser.parse_args()

# Check for early fail condition
if args.peers < 1:
    print('ERROR: PEERS < 1 (' + args.peers + ')')
    sys.exit(1)
elif args.peers > 100:
    print('WARNING: You are generating a large number of PEERS (' + args.peers + ')')
if os.path.isfile('./docker-compose.yml'):
    if args.force:
        print('INFO: docker-compose.yml exists and will be overwritten.')
    else:
        print('ERROR: docker-compose.yml already exists. Remove it or use -f to overwrite it.')
        sys.exit(2)

# functions which just return long strings
headertext = ('version: \'3.4\'\n\n'
              '# This file was automatically generated using generateDockerCompose.py\n'
              '# The template for this file is based on the example docker-compose file for IPFS Cluster\n'
              '# It runs three services per peer: One Cluster peer (clusterX) attached to an IPFS daemon (ipfsX)\n'
              '# with a copy of js-ipfs-http-client (searchX).\n'
              '# searchX runs the search code.\n\n\n')


def volumetext(numpeers):
    r = ''
    for i in range(numpeers):
        r += '  ipfs{i}:\n  cluster{i}:\n'.format(i=i)
    return '# Create volumes for persistant storage\nvolumes:\n' + r


def ipfstext(index, version):
    return ('  ipfs{i}:\n'
            '    container_name: ipfs{i}\n'
            '    image: ipfs/go-ipfs:{v} # tested with v0.4.20\n'
            '    volumes:\n'
            '      - ipfs{i}:/data/ipfs\n'
            '    command: ["daemon", "--migrate=true", "--enable-pubsub-experiment"]\n\n').format(i=index, v=version)


def clustertext(index, version, path):
    r = ('  cluster{i}:\n'
         '    container_name: cluster{i}\n'
         '    image: ipfs/ipfs-cluster:{v} # tested with v0.10.1\n'
         '    depends_on:\n'
         '      - ipfs{i}\n'
         '    links:\n'
         '      - ipfs{i}\n'
         '    environment:\n'
         '      CLUSTER_SECRET: ${{CLUSTER_SECRET}} # From shell variable\n'
         '      IPFS_API: /dns4/ipfs{i}/tcp/5001\n').format(i=index, v=version)
    if index < 10:
        r += ('    ports:\n'
              '          - "127.0.0.1:9{}94:9094" # API\n'.format(index))
    r += ('    volumes:\n'
          '      - cluster{i}:/data/ipfs-cluster\n'
          '      - {p}:/wait-for\n'
          '    entrypoint:\n'
          '      - "/sbin/tini"\n'
          '      - "--"\n'
          '    # Translation: Wait until ipfs{i} is reachable at 5001, because we get ERRORs when ipfs{i} '
          'isn\'t up yet\n').format(i=index, p=path)
    if index != 0:
        r += '    # Then: if state folder does not exist, find cluster0 id and bootstrap to it.\n'
    r += ('    command: >-\n'
          '      sh -c \'\n'
          '        cmd="daemon --upgrade"\n'
          '        exec /wait-for ipfs{i}:5001 --timeout=99 -- echo "ipfs{i} is up, we can start ourselves now" &\n'
          '        wait $$!\n').format(i=index, p=path)
    if index != 0:
        r += (8*' ' + 'if [ ! -d /data/ipfs-cluster/raft ]; then\n' +
              10*' ' + 'while ! ipfs-cluster-ctl --host /dns4/cluster0/tcp/9094 id; do\n' +
              12*' ' + 'sleep 1\n' +
              10*' ' + 'done\n' +
              10*' ' + 'pid=`ipfs-cluster-ctl --host /dns4/cluster0/tcp/9094 id | grep -o -E "^(\\w+)"`\n' +
              10*' ' + 'sleep 10\n' +
              10*' ' + 'cmd="daemon --bootstrap /dns4/cluster0/tcp/9096/ipfs/$$pid"\n' +
              8*' ' + 'fi\n')
    r += ('        exec /usr/local/bin/entrypoint.sh $$cmd\n' +
          '      \'\n\n')
    return r


def searchtext(index, path, nopkg):
    tag = 'pkg'
    if nopkg:
        tag = 'nopkg'
    return ('  search{i}:\n'
            '    container_name: search{i}\n'
            '    image: node-ipfs:{t}\n'
            '    depends_on:\n'
            '      - ipfs{i}\n'
            '    links:\n'
            '      - ipfs{i}\n'
            '    volumes:\n'
            '      - ipfs{i}:/data/files # maybe needed to access the files hosted on the node\n'
            '      - {p}:/data/app # path where into our /ipfsearch/ folder, where main.js is located\n'
            '    # This command waits until ipfs{i} is reachable before starting our .js with the argument ipfs{i}\n'
            '    command: ["/bin/sh", "/wait-for", "ipfs{i}:5001", "--timeout=99", "--", '
            '"npm", "run", "start", "ipfs{i}"]\n').format(i=index, p=path, t=tag)


def peertext(index, goV, clusterV, nopkg, waitPath, appPath):
    r = ''
    if index == 0:
        r += '\n# During the first start, default configurations are created for all peers.\nservices:\n'
    r += '\n\n' + 82*'#' + '\n' + '## Cluster PEER ' + str(index) + ' ' + 63*'#'
    if index < 10:
        r += '#'
    r += '\n' + 82*'#' + '\n\n'
    r += ipfstext(index, goV)
    r += clustertext(index, clusterV, waitPath)
    r += searchtext(index, appPath, nopkg)
    return r

# Generate the file
with open('docker-compose.yml', 'w') as f:
    # write header information
    f.write(headertext)
    # create volumes
    f.write(volumetext(args.peers))
    # create peers
    for i in range(args.peers):
        f.write(peertext(i, args.go_version, args.cluster_version, args.nopkg, args.wait_for, args.app_path))

print('SUCCESS: docker-compose.yml has been created.')
