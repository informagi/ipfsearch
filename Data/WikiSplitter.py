import time
import argparse
import os
import sys


# Arguments
parser = argparse.ArgumentParser(description="Split documents extracted by WikiExtractor.py into single files.")
parser.add_argument("-o", "--output", default="./dump",
                    help="Where to extract the files to, default: ./dump")
parser.add_argument("-n", "--newline", action="store_true",
                    help="Keep empty lines.")
parser.add_argument("path", nargs='?', default="./extracted",
                    help="Path where the extracted wiki files are, default: ./extracted")
args = parser.parse_args()


# Check for early fail condition
if not os.path.exists(args.output):
    print(f"INFO: Output folder {args.output} not found, creating it.")
    os.makedirs(args.output)
if not os.path.exists(args.path):
    print(f"ERROR: Input folder {args.path} not found.")
    sys.exit(1)


VALID_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_()"
articles = 0


def save_file(lines, title):
    invalid = True
    for line in lines:
        if len(line) > 3:
            if "may refer to:" not in line:
                invalid = False
                break
    if invalid:  # disambiguation or no text
        return
    global articles
    articles += 1
    with open(f"{args.output}/{''.join([c if c in VALID_CHARS else '#' for c in title.strip().replace(' ', '')])}.txt", "w", encoding="utf-8") as f:
        for line in lines:
            if not args.newline and line == "\n":
                continue
            f.write(line)


def read_file(file):
    with open(file, "r", encoding="utf-8") as f:
        lines = f.readlines()
        document = []
        title = ""
        for line in lines:
            if line[0] == '<':
                if "<doc id" in line:  # beginning
                    title = ""
                    document = []
                elif "/doc" in line:  # end
                    save_file(document, title)
                continue
            if title == "":
                title = line
            document.append(line)


def discover_files():
    for folder in os.listdir(args.path):
        for file in os.listdir(f"{args.path}/{folder}"):
            print(f"Processing {args.path}/{folder}/{file} ...")
            sys.stdout.flush()
            read_file(f"{args.path}/{folder}/{file}")


def hms_string(sec_elapsed):
    h = int(sec_elapsed / (60 * 60))
    m = int((sec_elapsed % (60 * 60)) / 60)
    s = sec_elapsed % 60
    return "{}:{:>02}:{:>05.2f}".format(h, m, s)


if __name__ == '__main__':
    start_time = time.time()  # tracking the time parsing/cleaning
    discover_files()
    elapsed_time = time.time() - start_time
    print(f"Extracted {articles} articles successfully.")
    print(f"Elapsed time: {hms_string(elapsed_time)}")

