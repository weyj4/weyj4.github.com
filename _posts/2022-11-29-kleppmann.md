---
layout: default
title: Notes on Designing Data-Intensive Applications
---
Notes on Martin Kleppmann's O'Reilly book
--------------------------------------------

### Part 2 - Distributed Data
#### Replication
Kleppmann next considers replication of data for purposes of high availability, reduced latency (thanks to geographic proximity for reads), and scalability of applications. *Single-Leader Replication* is the simplest and evidently most versatile replication model. Four alternate mechanisms for actual replication of writes from leader to followers are explained, roughly in order from lower to higher level of abstraction. *Statement-based replication* involves simply passing along the raw statement (for example a SQL command) and running the defined operation on each node. However, statements can easily be nondeterministic, in for instance the case of `NOW()` or `RAND()` functions. Next, a write-ahead log (WAL) can be used, much as in the case of a log structured database. The write ahead log is sent to each node, and it provides information about the desired end state of the database. However, WALs contain fairly low-level information about the data, at the level of individual bytes. This method is therefore dependent on the assumption that each node is running exactly the same hardware, with memory in the same state. In the case of a rolling database version update, for example, a WAL-based replication strategy would fail as different versions of the same database could be running on different nodes, with different pointers to points in memory for the same data model. Kleppmann mentions that PostgreSQL and Oracle use WAL-based replication strategies. *Logical, or row-based replication* involves communicating changes at the row level. This has similarities to *change data capture*. Finally, *trigger-based replication* involves configuring triggers in the application code, which abstracts changes to a higher level but has the requirement of custom transactions being controlled by user-defined code. This method is highly prone to bugs.

Kleppmann mentions three distinct replication lag issues that can arise from single-leader replication. First, a user who writes data and refreshes a web page may subsequently receive outdated data from a follower node which hasn't yet applied the user's own change. This is frustrating for users and gives rise to the concept of *read-after-write consistency*, where a given client should be guaranteed to read the data it has written - in the case of a web interface for example, the client should be guaranteed that on subsequent refreshes the leader, or a guaranteed up-to-date follower, is used as the source of data. A second issue, *Monotonic Reads*, occurs when a user is refreshing a web page and each request is load balanced across followers - while the first request may contain up-to-date data, subsequent requests may fetch outdated data, which is highly disorienting for the user. Finally, *consistent prefix reads* is a solution to the problem of database updates performed out of order, where a sequence is implied. Consistency is enforced by ensuring that a sequence of writes that have an ordered relationship should all be returned in that order or not returned at all.

Multi-Leader replication is useful to reduce latency, improve performance, and tolerate datacenter outages. Google Docs is a good example of an application that uses multi-leader replication. A new set of problems arises around write conflicts. Conflicts can be avoided by directing all writes through a single leader, but this approach negates some benefits of multi-leader configuration. *Last write wins (LWW)* is a protocol whereby writes are given IDs and, in the event of overlapping writes, the most recent write is displayed and previous versions are discarded. Another option is to merge information from different writes. Conflict resolution can be applied on write but also on read by the application, which somehow determines which data is valid.

Next, replication topologies - circular, star, all-to-all - are considered.

Leaderless Replication, such as that used by Dynamo, allows any replica to receive writes. The write is then propagated out to other nodes. In the event that a node is down when a write occurs, two mechanisms are employed to sync data: read repair and anti-entropy process. When read requests are made data is read from multiple nodes, and the system identifies any individual nodes that are returning out-of-date data. An anti-entropy process periodically checks the entire database for stale data. Kleppmann considers quorum in these cases.

#### Partitioning
The discussion of partitioning is relatively concise and, predictably, emphasizes *scalability* as the primary concern. It is assumed that a partitioned system also incorporates replication as discussed previously. Key range partitioning, as implemented by BigTable for instance, is explained, along with the drawback of hotspotting. Hotspotting is specifically covered by the BigTable documentation, as keys should be chosen such that range queries are efficient but data access is relatively evenly distributed across the database. Hashing keys is an option to avoid hotspotting but this strategy fails to provide efficient range querying. For example in MongoDB with hash-based sharding mode activated, range queries must be sent to all partitions. Cassandra has a hybrid implementation of a *compound primary key* whereby the first part of the key is hashed, so a query must reference a specific value for the first column, but additional keys can be queried by range. Document and term partitioning is also covered.

Request routing and *service discovery* is briefly mentioned. There are three ways of handling service discovery in a partitioned database system. Nodes can each contain information about the location of data on their sibling nodes - Cassandra and Riak use a *gossip protocol* of this sort, where information about cluster state is disseminated among nodes. Alternately, a routing tier such as Zookeeper can be used - the request is first passed through the routing tier, which contains a schema of data location, and then routed to the appropriate node. HBase and Kafka use Zookeeper in this way, and Mongodb has its own *config server* for the purpose.

The partitioning chapter was one of the shorter and more concise discussions in the book.

#### Transactions
This chapter opens with the concept of ACID transactions. Interestingly, Kleppmann points out that Consistency is properly an attribute of the application rather than the database, and he accordingly concentrates on the remaining principles of Atomicity, Isolation, and Durability. In particular, Isolation is considered as a hard problem in database design.

Kleppmann discusses two levels of transaction isolation. *Read committed* isolation, which is the default setting for Oracle, PostgreSQL, SQL Server, and many other databases, guarantees that dirty reads and dirty writes will not occur. A dirty read occurs when a transaction reads data that has been modified, but not committed, by another transaction. A dirty write modifies data that similarly is in the process of modification by a concurrent transaction.

Dirty writes are usually prevented with row-level locks: while a row or document is being written, no other transaction can access it. However for reads, locks are undesirable because they could greatly impact throughput in cases where a write is time-consuming. Therefore, it is more common for a database to simultaneously maintain a copy of the row's previous state, returned to read transactions while the row is being modified, and a new version which becomes available when a write is committed.

Read-committed isolation provides guarantess against dirty reads and writes, but it does not account for *read skew*, where a transaction could access various data which may become skewed by other transactions during the process of multiple reads. *Snapshot isolation* is implemented by maintaining a consistent snapshot of unmodified data which will be used by a transaction for its entire duration, regardless of whether the underlying database is modified by other transactions in that time.

In some cases the safest option is to simply use serializable isolation. The simplest implementation, actual serial execution, means literally running all transactions one after the other. This is actually a feasible option in many cases, as RAM is cheaper now than in the past and OLTP transactions are usually short and simple; OLAP transactions, on the other hand, are often primarily reads. *Two-phase locking (2PL)* means that a write blocks all reads and writes until commit, and likewise a read blocks all other reads and writes until commit. In this way it differs from snapshot isolation because with snapshots, reads don't block writes, and writes don't block reads.

A newer method, *Serializable Snapshot Isolation* operates on what Kleppmann describes as *optimistic* assumptions (as opposed to 2PL, which is *pessimistic*). Transactions are executed concurrently, and before being committed the system checks against a snapshot to determine if any conflicts have occurred.

#### Problems
- network faults
- unreliable clocks
- byzantine faults

#### Consistency and Consensus
- linearizability
- ordering of events; causality and total ordering
- how to atomically commit a distributed transaction
- solutions for consensus
- (CAP theorem)

## Derived Data
