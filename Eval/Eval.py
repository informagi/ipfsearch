import os
import json
import argparse
import sys

# Arguments
parser = argparse.ArgumentParser(description="Gather data and evaluate it.")
parser.add_argument("-f", "--force", action="store_true",
                    help="Wether to overwrite an existing output file.")
parser.add_argument("-i", "--input", default="../",
                    help="Path to where /ipfs0/, etc are located, default: ../")
parser.add_argument("output", nargs='?', default="output.md",
                    help="Name of the output file, default: output.md")
args = parser.parse_args()

# Check for early fail condition
if not os.path.exists(f"{args.input}ipfs0/"):
    print(f"ERROR: No input folder found ({args.input}ipfs0/).")
    sys.exit(2)
if os.path.exists(f"./{args.output}"):
    if not args.force:
        print(f"ERROR: {args.output} already exists (use -f to overwrite).")
        sys.exit(1)
    print(f'WARNING: overwriting {args.output}')
    sys.stdout.flush()


def addFilenamesToSearches():
    print(f"Adding filenames to searches ...")
    sys.stdout.flush()
    global data
    for search in data['searches']:
        for result in search['r']:
            result['name'] = data['hashes'][result['ref']]


def getSystemStats():
    print(f"Gathering general settings and stats of the enviornment ...")
    sys.stdout.flush()
    global data
    # load config
    with open(f'{args.input}config.js', "r", encoding='utf-8') as f:
        lines = f.readlines()
    for line in lines:
        if 'topics' in line:
            arr = line[24:line.index(';')]
            arr = json.loads(arr)
            data['system']['topics'] = arr
            data['system']['numTopics'] = len(arr)
        elif 'topicThreshold' in line:
            data['system']['topicThreshold'] = float(line[32:line.index(';')])
        elif 'maxChannels' in line:
            data['system']['maxChannels'] = int(line[29:line.index(';')])
        elif 'soSpace' in line:
            data['system']['soSpace'] = float(line[25:line.index(';')])


def getFileStats():
    print(f"Gathering file stats of the enviornment ...")
    sys.stdout.flush()
    # which files are hosted, which are searchable?
    searchableFiles = []
    unsearchableFiles = []
    for node in data['nodeSearches']:
        for topicFolder in [f for f in os.listdir(f'{args.input}{node["name"]}') if not os.path.isfile(f'{args.input}{node["name"]}/{f}')]:
            files = os.listdir(f'{args.input}{node["name"]}/{topicFolder}')
            if topicFolder in node['searches']:
                searchableFiles += files
            else:
                unsearchableFiles += files
    data['system']['distinctFiles'] = len(list(set(searchableFiles + unsearchableFiles)))
    unsearchableFiles = list(set(unsearchableFiles))
    searchableFiles = list(set(searchableFiles))
    for searchableFile in searchableFiles:
        if searchableFile in unsearchableFiles:
            unsearchableFiles.remove(searchableFile)
    data['system']['unsearchableFiles'] = len(unsearchableFiles)
    # what's the file distribution?
    for node in data['nodes']:
        node['totalDist'] = {}
        node['pinDist'] = {}
        node['soDist'] = {}
        # count files and init soDist to 0
        for topic in data['system']['topics']:
            topic = str(topic)
            node['totalDist'][topic] = 0
            node['soDist'][topic] = 0
            if os.path.exists(f"{args.input}{node['name']}/{topic}"):
                node['totalDist'][topic] = len(os.listdir(f"{args.input}{node['name']}/{topic}"))
        # load node so-stats
        with open(f'{args.input}{node["name"]}/so.json', "r", encoding='utf-8') as f:
            soDump = json.load(f)
            for doc in soDump['docs']:
                node['soDist'][doc['topic']] += 1
        # get the difference
        for topic in data['system']['topics']:
            topic = str(topic)
            node['pinDist'][topic] = node['totalDist'][topic] - node['soDist'][topic]


def getTotalStats():
    print(f"Totaling node stats ...")
    sys.stdout.flush()
    global data
    for nodeStats in data['nodes']:
        for k, v in nodeStats.items():
            if k == 'name':
                continue
            if k in data['total']:
                data['total'][k] += v
            else:
                data['total'][k] = v


def getNodeStats(nodeFolder):
    print(f"Gathering stats from {nodeFolder} ...")
    sys.stdout.flush()
    global data
    # load node hashes dict
    with open(f'{args.input}{nodeFolder}/hashes.json', "r", encoding='utf-8') as f:
        nodeHashes = json.load(f)
    data['hashes'] = {**data['hashes'], **nodeHashes}
    # load node data
    with open(f'{args.input}{nodeFolder}/stats.json', "r", encoding='utf-8') as f:
        nodeData = json.load(f)
    # add searches
    data['searches'] = data['searches'] + nodeData['searches']
    # modify dict
    data['nodeSearches'].append({'name': nodeFolder, 'searches': nodeData['providedSearches']})
    nodeData['name'] = nodeFolder
    nodeData['providedSearches'] = len(nodeData['providedSearches']) # list to int
    del nodeData['searches']
    # put into our global object
    data['nodes'].append(nodeData)


def writeOut():
    global data
    with open(f'{args.output}', 'w', encoding='utf-8') as f:
        # System
        f.write('# System\n\n')
        f.write('|Key|Value|\n|---|---|\n')
        for k, v in data['system'].items():
            f.write(f'|{k}|{v}|\n')
        # Nodes
        f.write(f'\n# Nodes')
        for node in data['nodes']:
            f.write(f'\n\n## {node["name"]}\n')
            f.write('|Key|Value|\n|---|---|\n')
            for k, v in node.items():
                if k not in ['name', 'totalDist', 'pinDist', 'soDist']:
                    f.write(f'|{k}|{v}|\n')
            f.write('---\n')
            # files
            f.write('|Topic|pinned Files|so Files|total Files|\n|---|---|---|---|\n')
            for topic in data['system']['topics']:
                topic = str(topic)
                f.write(f'|{topic}|{node["pinDist"][topic]}|{node["soDist"][topic]}|{node["totalDist"][topic]}|\n')
        # Total
        f.write(f'## Total/Avg\n\n')
        f.write('|Key|Total|Average|\n|---|---|---|\n')
        for k, v in data['total'].items():
            f.write(f'|{k}|{v}|{v/data["system"]["numNodes"]}|\n')
        # Searches
        f.write(f'\n# Searches\n\n')
        f.write('Only the top 3 results per search are printed here.\n\n')
        f.write('|Query|Score|Document|\n|---|---|---|\n')
        for search in data['searches']:
            f.write(f'|{search["q"]}|{search["r"][0]["score"]}|{search["r"][0]["name"]}|\n')
            for result in search["r"][1:3]:
                f.write(f'| |{result["score"]}|{result["name"]}|\n')

data = {}                  # global object where all data is stored
data['system'] = {}        # info on the enviornment settings
data['nodes'] = []         # stats of the individual nodes
data['total'] = {}         # total stats of all nodes aggregated
data['searches'] = []      # searches and results
data['hashes'] = {}        # hash-filename dict
data['nodeSearches'] = []  # searches provided by nodes
nodeFolders = [f for f in os.listdir(args.input) if not os.path.isfile(os.path.join(args.input, f)) and 'ipfs' in f]
numNodes = len(nodeFolders)
data['system']['numNodes'] = numNodes
print(f"Gathering stats from {numNodes} nodes.")
sys.stdout.flush()
for nodeFolder in nodeFolders:
    getNodeStats(nodeFolder)
getTotalStats()
getSystemStats()
addFilenamesToSearches()
getFileStats()
print(f"Stats gathered.")
sys.stdout.flush()
writeOut()
