import os
import json
import argparse
import sys

# Arguments
parser = argparse.ArgumentParser(description="Lift the relevance of all results above a threshold to 1.")
parser.add_argument("-t", "--threshold", type=float, default=0.1,
                    help="Threshold above which all relevances will be lifted to 1.")
parser.add_argument("input", nargs='?', default="input",
                    help="Name of the input file, default: input")
args = parser.parse_args()

# Check for early fail condition
if not os.path.exists(f"{args.input}.qrels"):
    print(f"ERROR: No input file found ({args.input}.qrels/).")
    sys.exit(0)
if args.threshold < 0.0:
    print(f"ERROR: Threshold below 0 ({args.threshold}).")
    sys.exit(1)
elif args.threshold > 1.0:
    print(f"ERROR: Threshold above 1 ({args.threshold}).")
    sys.exit(1)


def liftRelevance():
    with open(f'{args.input}.qrels', "r", encoding='utf-8') as f:
        lines = f.readlines()
    with open(f'{args.input}.qrels', "w", encoding='utf-8') as f:
        for line in lines:
            line = line.split()
            if float(line[-1]) > args.threshold:
                line[-1] = '1'
            f.write(' '.join(line) + '\n')

liftRelevance()
