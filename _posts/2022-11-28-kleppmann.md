---
layout: default
title: Notes on Designing Data-Intensive Applications
---
Notes on Martin Kleppmann's O'Reilly book
--------------------------------------------

### Intro
These are notes I took while reading Martin Kleppmann's very informative O'Reilly book, Designing Data-Intensive Applications.

## Database Implementations
Kleppmann begins by describing a charmingly simple key-value store implemented on the command line:
```
#!/bin/bash

db_set() {
    echo "$1, $2" >> database
}

db_get() {
    get "^$1," database | sed -e "s/^$1,//" | tail -n 1
}
```
This database is simply an append-only text file. Setting new records is performant because appending to files is efficient. In fact, this append-only file structure is a *log* in the general sense of an 'append-only sequence of records.' However, getting a record is inefficient - `O(n)` time - because `db_get` has to scan the entire database looking for occurrences of the desired key.
An *index* is a data structure derived from primary data that most databases maintain to allow reasonable efficiency in manipulating records. A key-value store is a hash map, and an index can be created by maintaining an in-memory hash map of keys, where each key is mapped to a byte offset in the data file containing values. This simple log-based implementation can be further developed by *segmenting* the data on disk, so that value data is spread across multiple segments. These segments can be periodically merged or *compacted*, with duplicates removed and replaced with the most recent data. In this way updates and deletes can be accomplished efficiently, and disk space is used efficiently. Reads should begin from the most recent segment to ensure fresh data is retrieved. In particular deletes can be accomplished via *tombstone* records: when segments are merged this record tells us not to copy over the referenced value. Appending and merging are sequential write operations and therefore quite efficient.
However Kleppmann points out two drawbacks: the hash table for keys is stored in memory, so we are limited to a database with only as many 'rows' as can be fit in memory (maintaining the hash map on disk involves a lot of I/O and sort of defeats the point). Furthermore, range queries are not really facilitated by this model: records are written in arbitrary order so there's no expectation that keys 'A' - 'D' are in sequential order in the hash map.
#### Sorted String Tables and Log-Structured Merge Trees
Motivated by these failings of the simplest possible implementation, Kleppmann moves on to a description of SSTables: essentially this is the same as before, but the sequence of key-value pairs is sorted by key. Segments are held in memory (this structure is the *memtable*) until they reach a certain size, then sorted and persisted to the database. Merging segments is now essentially *merge sort*. Additionally, we no longer need to hold all keys in memory: we can keep a sparse hash map of keys in memory and do small range queries for values in between extant keys from memory. Finally, compression is facilitated because records are grouped into blocks and compressed before writing to disk.
- *Bloom Filters* TODO TODO TODO
In some cases it can be very inefficient to search for non-existent keys, as you have to keep doing range lookups over older segments. Bloom filters...

LSM-Trees constructed with SSTables are an efficient data structure allowing for fast range queries and high write throughput (disk writes are sequential).

#### B-Trees
B-Trees are the most ubiquitous data structure underlying modern databases. Instead of breaking the database down into variable-size segments, B-Trees maintain a tree of *pages* of fixed size. These pages contain keys in sorted order. Each page contains a size-limited set of sequential keys, in between which are references to child pages containing a subset of keys falling between the previous and next key, sequentially. You traverse the tree until you get to the page which contains the exact key desired. With a balanced tree, this involves O(logn) time, and it is rare for a B-Tree database to need more than three or four levels. A four-level tree with 4KB pages with a branching factor (number of references per page) of 500 can store up to 250 TB.

When a B-tree is updated the entire page is retrieved, updated, and overwritten on disk. In the event of a crash, this can mean a page is lost and child pages become orphans, their data disconnected from the tree and lost. *Write-ahead logs* are typically used to prevent this eventuality. A WAL is an append-only log containing a list of all B-tree modifications in process. The WAL is written to disk and, in a crash, retrieved to reconstruct the lost page and insert it back into the tree.

One drawback here is that in a B-tree, every write to the database actually entails two write operations: one to the WAL and one to the tree itself. This is known as *write amplification*. Additionally, every B-tree write requires an entire page to be rewritten. Therefore, in general LSM-trees are considered more performant for writes than B-trees. B-trees can also have unused storage per page, making LSM-trees more storage-efficient.

LSM-trees entail an ongoing background process of compaction, which could in some cases limit throughput for active read/write operations, depending on the implementation.

#### TODO: multi-indexes

## Data Encoding
Kleppmann motivates the discussion of data encoding with the twin concerns of forward and backward compatibility: as the data model and implementation changes, application code should be able to continue accessing data and updating the database.

In-memory data is kept in language-specific structures such as objects, lists, arrays, hash tables, trees. When data needs to be *encoded* (that is, *serialized* or *marshalled*) to write to file or send over a network, it must be converted to a byte sequence. Initially language-specific formats lend themselves to this purpose: Python has `pickle`. However these encodings are language-bound and generally must be accessed in the same way they were created; furthermore these convenient language-specific serialization formats are not always efficient in terms of CPU for encoding and space requirements.

#### Encodings
JSON, XML, and Binary encodings are standardized and can be written and read by most programming languages. However, JSON and XML have limited support for data types (encoding of numbers in particular). They also use more space than necessary.

Thrift and Protocol Buffers (protobuf) offer more efficient serialization. By defining custom schemas, these formats allow data to be stored with minimal space requirements. Avro is the most space-efficient option, but it differs from protobufs and Thrift in that values must be written and read in the order specified in the schema (there are no field identifiers in the encoded data). Thus both reader and writer applications need to have exactly the same schema for forward and backward compatibility.

#### Data Flow
Data flow entails the reading and writing of data, either into and out of database, through networks via REST/RPC, and via message passing. In all three cases forward/backward compatibility is a serious concern. In the case of databases, an example is that a newer version of an application writes data, which is then read by an older version of the client application. In the case of dataflow across service via REST and RPC, an application-specific API, rather than a database query language, governs access. Kleppmann articulates some concerns with RPC, as RPC calls give the impression of calling application code when in fact they are triggering a remote operation in a separate service. Protobufs implement gRPC as an example of RPC calls. Finally, Kleppmann considers message brokers such as Pub/Sub. TODO so what?