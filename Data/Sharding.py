import os
import shutil
import math
from random import randrange, choice
from operator import itemgetter
from gensim.corpora import Dictionary
from gensim.models.ldamodel import LdaModel
# https://radimrehurek.com/gensim/apiref.html

import argparse
import sys

# Arguments
parser = argparse.ArgumentParser(description="Cluster files into shards and move them to peers.")
parser.add_argument("-t", "--topics", type=int, default=5,
                    help="the number of topics to create, default: 5")
parser.add_argument("-n", "--nodes", type=int, default=5,
                    help="the number of peers to distribute the files to, default: 2")
parser.add_argument("-d", "--distribution", type=float, nargs='+', default=[0.5],
                    help="List of percentage per topic (e.g. 0.5, 0.3: 50\% of files belong " +
                    "to one topic, 30\% to another and the remaining 20\% are distributed randomly), default: 0.5")
parser.add_argument("-m", "--maxfiles", type=int, default=2000,
                    help="Maximum files per node, default: 2000")
parser.add_argument("-i", "--input", default="./dump",
                    help="Input-folder, default: ./dump")
parser.add_argument("-o", "--output", default="../",
                    help="Output-folder, default: ../")
parser.add_argument("mode", nargs='?', default="Random",
                    help="How to cluster the documents: 'Random', 'LDA', 'loadLDA', 'None'")
args = parser.parse_args()

# Check for early fail condition
if args.topics < 1:
    print('ERROR: TOPICS < 1 (' + args.topics + ')')
    sys.exit(1)
elif args.topics > 10:
    print('WARNING: You are generating a large number of TOPICS (' + args.topics + ')')
    sys.stdout.flush()
if args.maxfiles < 1:
    print('ERROR: maxfiles < 1 (' + args.maxfiles + ')')
    sys.exit(1)
elif args.maxfiles > 5000:
    print('WARNING: You are distributing a large number of files per node (' + args.maxfiles + ')')
    sys.stdout.flush()
if args.nodes < 1:
    print('ERROR: NODES < 1 (' + args.nodes + ')')
    sys.exit(1)
if args.mode not in ['Random', 'LDA', 'loadLDA', 'None']:
    print(f"ERROR: Unknown mode of sharding: {args.mode}")
    sys.exit(2)
if not os.path.exists(f"{args.output}/"):
    print(f"ERROR: Out-Folder {args.output}/ not found.")
    sys.exit(3)
if not os.path.exists(f"{args.input}/"):
    print(f"ERROR: Folder {args.input}/ not found.")
    sys.exit(4)
if len([f for f in os.listdir(args.input) if os.path.isfile(os.path.join(args.input, f))]) < 1 and args.mode != 'None':
    print(f"ERROR: No files in {args.input}/ found.")
    sys.exit(4)
if sum(args.distribution) > 1:
    print(f"ERROR: distribution > 1 ({sum(args.distribution)}).")
    sys.exit(1)


def moveFile(filename, topic, node=-1):
    """ Move file into ipfsX/topic/ folder or dump/topic if node == -1
    """
    if node == -1:
        if not os.path.exists(f"{args.input}/{topic}/"):
            os.makedirs(f"{args.input}/{topic}/")
        os.rename(f"{args.input}/{filename}", f"{args.input}/{topic}/{filename}")
        return
    if not os.path.exists(f"{args.output}ipfs{node}/{topic}/"):
        os.makedirs(f"{args.output}ipfs{node}/{topic}/")
    # move
    # os.rename(f"{args.input}/{topic}/{filename}", f"{args.output}ipfs{node}/{topic}/{filename}")
    # copy:
    shutil.copyfile(f"{args.input}/{topic}/{filename}", f"{args.output}ipfs{node}/{topic}/{filename}")


def trainModel():
    """ Train a model
    """
    if args.mode == 'Random':
        return args.topics, 0
    # need to train on dump
    files = [f"{args.input}/{f}" for f in os.listdir(args.input) if os.path.isfile(os.path.join(args.input, f))]
    if args.mode == 'LDA':
        # create dictionary
        with open(files[0], "r", encoding='utf-8') as f:
            dct = Dictionary([' '.join(f.readlines()).split()])
        for filename in files[1:]:
            with open(filename, "r", encoding='utf-8') as f:
                dct.add_documents([' '.join(f.readlines()).split()])
        # create corpus
        corpus = []
        for filename in files:
            with open(filename, "r", encoding='utf-8') as f:
                corpus.append(dct.doc2bow(' '.join(f.readlines()).split()))
        lda = LdaModel(corpus, num_topics=args.topics)
        lda.save("./models/LDAdump.model")
        dct.save("./models/LDAdump.dct")
        return lda, dct
    if args.mode == 'loadLDA':
        return LdaModel.load("./models/LDAdump.model"), Dictionary.load("./models/LDAdump.dct")


def shardFiles(model=0, dct=0):
    """ Distribute files into subfolders, according to their topic
    """
    files = [f for f in os.listdir(args.input) if os.path.isfile(os.path.join(args.input, f))]
    if args.mode == 'Random':
        for file in files:
            moveFile(file, randrange(model))
    if args.mode == 'LDA' or args.mode == 'loadLDA':
        # https://radimrehurek.com/gensim/models/ldamodel.html
        for filename in files:
            with open(f"{args.input}/{filename}", "r", encoding='utf-8') as f:
                tmp = model[dct.doc2bow(' '.join(f.readlines()).split())]
            moveFile(filename, max(tmp, key=itemgetter(1))[0])


def distributeFiles(numFiles):
    """ Move files to nodes
    """
    nodeFiles = min(math.ceil(numFiles/args.nodes), args.maxfiles)
    emptyTopics = []
    for n in range(args.nodes):
        numMovedFiles = 0
        movedFiles = []
        doneTopics = []
        topic = choice([t for t in os.listdir(args.input) if t not in doneTopics + emptyTopics])
        topicIndex = 0
        topicLimit = nodeFiles*args.distribution[topicIndex] + numMovedFiles
        while numMovedFiles < nodeFiles:
            if len([t for t in os.listdir(args.input) if t not in emptyTopics]) == 0:
                return  # no directories left
            if numMovedFiles < topicLimit:
                # get a file of our topic
                f = choice([f for f in os.listdir(f"{args.input}/{topic}") if f not in movedFiles])
                moveFile(f, topic, n)
                numMovedFiles += 1
                movedFiles.append(f)
                if len([f for f in os.listdir(f"{args.input}/{topic}") if f not in movedFiles]) <= 0:
                    # all files of topic moved
                    emptyTopics.append(f"{topic}")
                    if len([t for t in os.listdir(args.input) if t not in emptyTopics]) <= 0:
                        return  # no more files
            else:
                if numMovedFiles >= topicLimit:
                    doneTopics.append(topic)
                # get a new topic
                topicIndex += 1
                if topicIndex < len(args.distribution):
                    # fixed percentage
                    topic = choice([t for t in os.listdir(args.input) if t not in emptyTopics + doneTopics])
                    topicLimit = nodeFiles*args.distribution[topicIndex] + numMovedFiles
                else:
                    # random
                    topic = choice([t for t in os.listdir(args.input) if t not in emptyTopics])
                    topicLimit = numMovedFiles + 1


if args.mode != 'None':
    numFiles = len([f for f in os.listdir(args.input) if os.path.isfile(os.path.join(args.input, f))])
    print(f"Sorting {numFiles} files into {args.topics} topics using {args.mode}.")
    print(f"Then distributing them to {args.nodes} peers with distribution {args.distribution}.")
    sys.stdout.flush()
    model, dct = trainModel()
    print(f"{args.mode} model trained.")
    sys.stdout.flush()
    shardFiles(model, dct)
    print(f"Files sorted.")
    sys.stdout.flush()
else:
    topicFolders = [os.path.join(args.input, f) for f in os.listdir(args.input) if not os.path.isfile(os.path.join(args.input, f))]
    numFiles = 0
    for folder in topicFolders:
        numFiles += len([f for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))])
    print(f"{numFiles} Files were already sorted.")
    print(f"Distributing them to {args.nodes} peers with distribution {args.distribution}.")
    sys.stdout.flush()
distributeFiles(numFiles)
print(f"Files distributed.")
sys.stdout.flush()
