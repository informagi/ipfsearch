import os
import shutil
import math
import json
from random import choice
from copy import deepcopy
from operator import itemgetter
from gensim.corpora import Dictionary
from gensim.models.ldamodel import LdaModel
# https://radimrehurek.com/gensim/apiref.html

import argparse
import sys

# Arguments
parser = argparse.ArgumentParser(description="Generate queries and move them to different peers.")
parser.add_argument("-n", "--nodes", type=int, default=-1,
                    help="the number of peers to distribute the queries to (-1 = all), default: -1")
parser.add_argument("-m", "--mode", default="Random",
                    help="How to classify the queries: 'Random', 'loadLDA'")
parser.add_argument("-i", "--input", default="",
                    help="Input-file with one query per line, optional, default: None")
parser.add_argument("-o", "--output", default="../",
                    help="Output-folder, where /ipfs0/ etc. are located, default: ../")
parser.add_argument("numberQueries", nargs='?', type=int, default=5,
                    help="How many queries to distribute in total, default: 5")
args = parser.parse_args()

# Check for early fail condition
if not os.path.exists(f"{args.output}"):
    print(f"ERROR: Out-Folder {args.output} not found.")
    sys.exit(1)
if args.nodes == 0:
    print('ERROR: Nodes == 0. Choose -1 for all or n > 0 for the number of nodes')
    sys.exit(2)
if args.nodes > 0:
    for node in range(args.nodes):
        if not os.path.exists(f"{args.output}/ipfs{node}"):
            print(f"ERROR: Out-Folder {args.output}/ipfs{node} not found.")
            sys.exit(1)
if len(args.input) > 0 and not os.path.exists(f"{args.input}"):
    print(f"ERROR: Input-file {args.input} not found.")
    sys.exit(1)
if args.mode not in ['Random', 'loadLDA']:
    print(f"ERROR: Unknown mode of classifying topic: {args.mode}")
    sys.exit(2)
if args.numberQueries < 1:
    print('ERROR: Number of queries < 1 (' + args.numberQueries + ')')
    sys.exit(2)
elif args.numberQueries > 5000:
    print('WARNING: You are generating a large number of queries (' + args.numberQueries + ')')
    sys.stdout.flush()


def loadModel():
    """ Load a model
    """
    if args.mode == 'Random':
        topics = []
        for node in [n for n in os.listdir(args.output) if 'ipfs' in n and not os.path.isfile(f'{args.output}{n}')]:
            topics += [f for f in os.listdir(f'{args.output}{node}') if not os.path.isfile(f'{args.output}{node}/{f}')]
        topics = list(set(topics))
        return topics, 0
    if args.mode == 'loadLDA':
        return LdaModel.load("./models/LDAdump.model"), Dictionary.load("./models/LDAdump.dct")


def getQueries():
    """ Load queries
    """
    queryTerms = []
    if len(args.input) > 0:
        with open(args.input, 'r', encoding='utf-8') as f:
            queryTerms = [line.strip() for line in f.readlines()]
    if len(queryTerms) > args.numberQueries:
        queryTerms = queryTerms[:args.numberQueries]
    while len(queryTerms) < args.numberQueries:
        # find a random file
        node = choice([n for n in os.listdir(args.output) if 'ipfs' in n and not os.path.isfile(f'{args.output}{n}')])
        topic = choice([t for t in os.listdir(f'{args.output}{node}') if not os.path.isfile(f'{args.output}{node}/{t}')])
        file = choice([f for f in os.listdir(f'{args.output}{node}/{topic}')])
        with open(f'{args.output}{node}/{topic}/{file}', 'r', encoding='utf-8') as f:
            # find a random word
            words = ' '.join(f.readlines()).split()
            word = choice(words)
            while len(word) < 5:
                # poor man's stopword filter
                word = choice(words)
            queryTerms.append(word)
            # maybe a second one
            if choice([True, False, False]):
                word = choice(words)
                while len(word) < 4:
                    # poor man's stopword filter
                    word = choice(words)
                queryTerms[-1] += ' ' + choice(words)
    return queryTerms


def classifyQueries(model=0, dct=0):
    """ Classify queries into topics according to the model
    """
    queries = getQueries()
    r = {'queries': [], 'topics': {}}
    if args.mode == 'Random':
        for query in queries:
            r['queries'].append({'q': query, 's': 2.0})
            r['topics'][query] = choice(model)
    if args.mode == 'loadLDA':
        # https://radimrehurek.com/gensim/models/ldamodel.html
        for query in queries:
            tmp = model[dct.doc2bow(query.split())]
            r['queries'].append({'q': query, 's': 2.0})
            r['topics'][query] = max(tmp, key=itemgetter(1))[0]
    return r


def distributeQueries(queries):
    """ Distribute query files to nodes
    """
    numNodes = args.nodes
    if numNodes < 0:
        numNodes = len([n for n in os.listdir(args.output) if 'ipfs' in n and not os.path.isfile(f'{args.output}{n}')])
    nodeQueries = math.ceil(args.numberQueries/numNodes)
    for n in range(numNodes):
        q = deepcopy(queries)
        q['queries'] = q['queries'][nodeQueries*n:nodeQueries*(n+1)]
        with open(f'{args.output}ipfs{n}/queries.json', 'w', encoding='utf-8') as f:
            json.dump(q, f)


model, dct = loadModel()
queries = classifyQueries(model, dct)
distributeQueries(queries)
print('Queries successfully distributed.')
