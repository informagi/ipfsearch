import os
import json
import argparse
import sys

# Arguments
parser = argparse.ArgumentParser(description="Remove documents that appear multiple times for a query.")
parser.add_argument("input", nargs='?', default="input",
                    help="Name of the input file, default: input")
args = parser.parse_args()

# Check for early fail condition
if not os.path.exists(f"{args.input}.results"):
    print(f"ERROR: No input file found ({args.input}.results).")
    sys.exit(0)


def removeDupes():
    with open(f'{args.input}.results', "r", encoding='utf-8') as f:
        lines = f.readlines()
    with open(f'{args.input}.results', "w", encoding='utf-8') as f:
        query = ''
        docs = []
        for line in lines:
            line = line.split()
            if line[0] != query:
                query = line[0]
                docs = []
            if line[2] not in docs:
                f.write(' '.join(line) + '\n')
            docs.append(line[2])

removeDupes()
