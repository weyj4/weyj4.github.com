---
layout: default
title: Python-Fun with Dictionaries
---

I was asked a question recently that was conceptually very simple, but I got hung up on implementing the solution in Python due to my lack of experience with manipulating Python dictionaries, which are hash tables. Here's the question:

> Given a list of elements, return another list sorted by the frequency of elements in the original list.

The wording was something like that. Anyway, the application that comes to mind is text processing. Here's a sample list:

``` python
sample = ['this', 'is', 'my', 'list', 'my', 'list', 'is', 'a', 'good', 'list']
```

So the idea is to have a frequency distribution for this list. This is a very common problem in Natural Language Processing, once you've tokenized a text. So common, in fact, that there are tons of easier ways to do it besides implementing it by hand, but oh well...

Let's use a hash table to count occurrences of each word:

``` python
freq_hash = {}
for i in sample:
  freq_hash[i] = freq_hash.get(i, 0) + 1
```

This returns ``` {'a': 1, 'good': 1, 'this': 1, 'is': 2, 'list': 3, 'my': 2} ```. For the record, there's another way to do this using defaultdict:

``` python
from collections import defaultdict
freq_hash = defaultdict(int)
for i in sample:
  freq_hash[i] += 1
```

The danger of using defaultdict is that any value you call, even if it's not even a string, will still return a value, 0. So let's stick with get().

The part I got tripped up on was sorting the hash I'd created. Dictionaries in Python, being hash tables, are unordered (actually they're stable, in the sense that list(freq_hash) == list(freq_hash), because they're hashed to optimize lookup time).

However, you can return a sorted list using the operator module's itemgetter(). I keep needing to create and manipulate frequency distributions for NLP, and I'm increasingly aware that I need to get better with dictionary operations for that purpose. Anyway, here's how to sort a dictionary by value and return a list:

``` python
from operator import itemgetter
sorted(freq_hash.iteritems(), key=itemgetter(1), reverse=True)
```

So you pass the index 1 to itemgetter. If we'd used key=itemgetter(0), we'd end up with a list sorted alphabetically by keys. Not particularly intuitive, but it works.
