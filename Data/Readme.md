# Getting testing data

Here we lay out the steps necessary to obtain/generate the required data.

## Dataset
Firstly, we decide on a dataset.
You can use any dataset of your choosing, as long as one document = one .txt-file.
We explain the steps we took for our data in detail.

### Wikipedia
Download any wikipedia dump [here](https://dumps.wikimedia.org/enwiki/latest/).
We chose the subset `enwiki-latest-pages-meta-current1.xml-p10p30303.bz2`.

Download [`WikiExtractor.py`](https://github.com/attardi/wikiextractor).

Use `WikiExtractor.py` to extract the articles into smaller plain text files:
```bash
python WikiExtractor.py -o extracted enwiki-latest-pages-meta-current1.xml-p10p30303.bz2
```
This would extract the file `enwiki-latest-pages-meta-current1.xml-p10p30303.bz2` into the folder `./extracted/`.

Our script `WikiSplitter.py` can then be used to split the generated `wiki_00`, etc. into text files containing only one article each.
It also removes disambiguation pages, empty articles and (optionally) empty lines.
```bash
python WikiSplitter.py -o dump extracted
```
This outputs the documents from `./extracted/` to `./dump`.


## Sharding
Now that the data has been obtained it needs to be sharded, meaning it has to be split into different topic-shards.
To do this we provide a script called `Sharding.py`.

```bash
python Sharding.py -t 4 -n 3 LDA
```
This sorts the documents into 4 topics (`-t`) using LDA and then distributes them to 3 nodes (`-n`).
This means that on completion the files will have moved into `../ipfs0/0/`, etc.
The folders inside the `/ipfsX/` folders denote the topic that the files belong to.

## Using the data
Finally, if they are not already there, move the `/ipfs0/`, etc. folders up into the repository's root such that they can be used by the search nodes.

Now return to (or start with) the `Readme.md` inside the [`../DockerSetup/`](https://github.com/informagi/ipfsearch/tree/master/DockerSetup) folder.
