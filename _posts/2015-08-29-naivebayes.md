---
layout: default
title: A Walk through NLTK's Naive Bayes Classifier
---
A Walk through NLTK's Naive Bayes Classifier
--------------------------------------------

### Basic Use Case

One of the tools I've come to rely upon while building a Flask app with Python's Natural Language Toolkit is NLTK's built-in Naive Bayes classifier. Here's a very simple example of its use:

``` python
import nltk
import random
from nltk.corpus import names

labeled_names = ([(name, 'male') for name in names.words('male.txt')] +
                [(name, 'female') for name in names.words('female.txt')])
random.shuffle(labeled_names)

def gender_features(name):
    return {'suffix1': name[-1:],
            'suffix2': name[-2:]}

featuresets = [(gender_features(n), gender) for (n, gender) in labeled_names]
labeled_featureset, test_set = featuresets[500:], featuresets[:500]

classifier = nltk.NaiveBayesClassifier.train(labeled_featureset)

name = 'Susanna'
classifier.classify(gender_features(name))

nltk.classify.accuracy(classifier,test_set)
```

We've just trained a classifier that classifies a name as either 'Male' or 'Female', with about 78% accuracy against our test set. 

IMPORTANT: What follows is not 'required' knowledge for using NLTK as demonstrated above. If you're having a good time with this name-classification program, by all means keep playing with it, and see what you can do to improve its accuracy or expand its scope. However, if you're someone with some object-oriented programming experience, and you want to look under the hood with me, keep reading! 

### Training the Classifier

When we train a Naive Bayes classifier, we pass a labeled featureset to a class method, train. This method will process the featureset to return an instance of the class initialized with two new variables: label_probdist and feature_probdist. Label_probdist is simply the prior probability of a label, calculated by checking the frequency of each label in the training set:

``` python
label_freqdist = FreqDist()
for featureset, label in labeled_featureset:
    label_freqdist[label] += 1

label_freqdist
FreqDist({'female': 4681, 'male': 2763})
```

Feature_probdist corresponds to P(fval&#124;label, fname), or the probability of a feature, given a label. We begin by calculating feature_freqdist, which is a dictionary of frequency distributions. In this case there are 4 frequency distributions, each corresponding to a combination of label and feature name:

``` python
feature_freqdist = defaultdict(FreqDist)
for featureset, label in labeled_featuresets:
    for fname, fval in featureset.items():
        feature_freqdist[label, fname][fval] += 1

>>> feature_freqdist['male','suffix2']
FreqDist({u'on': 147, u'ie': 139, u'er': 113, u'an': 99, u'in': 97, u'ey': 79, u'rd': 62, u'el': 61, u'en': 60, u'us': 59, ...})
>>> feature_freqdist['male','suffix2'].freq('on')
0.053203040173724216
```

We can see that the most common value for 'suffix2' among males in the dataset is 'on', which occurs in about 5.3% of names. But we aren't quite there yet! Consider the following:

``` python
feature_freqdist['male','suffix2'].hapaxes()
[u'gt', u'gg', u'ln', u'lu', u'ti', u'tf', u'tu', u'ya', u'dt', u'ub', u'za', u'ec', u'eu', u'ep', u'ru', u'Hy', u'rp', u'az', u'rg', u'rb', u'ba', u'bo', u'aj', u'ji', u'oh', u'og', u'of', u'Bo', u'xe', u'iz', u'Jo', u'jy', u'ua', u'ka', u'Si', u'uy', u'ut', u'Cy', u'mp', u'ms', u'Ed', u'ug', u'uc', u'aa', u'ix', u'ac', u'ab', u'ae', u'ag', u'Ty', u'ao', u'ax', u'if', u'la', u'na', u'vo', u'ft', u'Ez', u'fa', u'sa', u'Ev', u'up', u'ko', u'Al', u'si', u'nc', u'ct', u'Er']
```

This is a list of all the 2-letter suffixes that occur only once in the training data (that's what a hapax is). Notice that one of the hapaxes is 'ix'.

``` python
[w for w in names.words('male.txt') if w.endswith('ix')]
[u'Felix, Alix'] ##Alix in this case is part of the test_data set, so Felix is the only '-ix' name in the training data
```

### Smoothing Some Wrinkles

So here's the problem with our frequency distribution as a probability model: what if our train/test split had been different, and both 'Felix' and 'Alix' had been left out of the training data? The feature value 'ix' for 'suffix2' could have been 0! No matter how snugly the rest of our features fit this input, 'Felix' would never be classified as a male name.

To account for this possibility, NLTK uses a form of [smoothing](https://en.wikipedia.org/wiki/Additive_smoothing), passing the frequency distributions to another class, [ELEProbDist](https://github.com/nltk/nltk/blob/develop/nltk/probability.py#L777). ELE stands for Expected Likelihood Estimate, and it is calculated in turn by passing the values to another class, LidstoneProbDist, along with a gamma parameter, 0.5. Lidstone smoothing is a form of additive smoothing that effectively adds some amount 'gamma' to each value, in this case 0.5, to solve the problem of absent features in the training set. Ultimately, the output is calculated like this:

``` python
gamma = 0.5
divisor = feature_freqdist.N() + feature_freqdist.B()*gamma
c = feature_freqdist[fname]
return (c + gamma)/divisor
```

Where the FreqDist methods N() and B() return the total number of sample outcomes, and the total number of 'bins', or sample values, in the frequency distribution.

This happens [here](https://github.com/nltk/nltk/blob/develop/nltk/classify/naivebayes.py#L225) in the source code. Having passed the feature_freqdist to 'estimator' (the ELE class) we now have a proper feature_probdist<sup id="a1">[1](#f1)</sup>. Where before we had

``` python
>>> feature_freqdist['male','suffix2']
FreqDist({u'on': 147, u'ie': 139, u'er': 113, u'an': 99, u'in': 97, u'ey': 79, u'rd': 62, u'el': 61, u'en': 60, u'us': 59, ...})
>>> feature_freqdist['male','suffix2'].freq('on')
0.053203040173724216
```

we can now do this:

``` python
from nltk.probability import ELEProbDist as estimator
feature_probdist = {}
for ((label, fname), freqdist) in feature_freqdist.items():
    probdist = estimator(freqdist, bins=len(feature_values[fname]))
    feature_probdist[label, fname] = probdist    

feature_probdist['male','suffix2'].prob('on')
0.050783267343776896
```

So that changed our probability a little, but it also solved a potentially significant problem. That new method 'prob' is inherited through ELEProbDist (estimator), which inherits it from LidstoneProbDist, which inherited it from [ProbDistI](https://github.com/nltk/nltk/blob/develop/nltk/probability.py#L349), one of the base classes of nltk.probability. It returns the base 2 log of the probability for a given sample.

### Classifying an Input

Whew. Training the classifier sounded complicated, largely because of smoothing, but nothing too fancy actually happened. Now we actually have an instance of NaiveBayesClassifier with 2 probability distributions: label_probdist, which is the prior probability P(label), and feature_probdist, P(fname=fval&#124;label), which in Bayesian terms I think is known as the expected value of the posterior distribution. Actually classifying an input at this point is pretty simple:

``` python
logprob = {}
for label in ['male','female']:
    logprob[label] = label_probdist.logprob(label)  #logprob is another of ProbDistI's that just directly returns the base 2 log of probability
>>> logprob
{'male': -1.4282099250266378, 'female': -0.6702257953741542}
```

This says that, based on training data, if we were to randomly choose a name, it's about twice as UNlikely that it'd be a male name as a female one. That makes pretty good sense, given our original frequency distribution, ```FreqDist({'female': 4681, 'male': 2763})```.
    
Now we've got a dictionary of priors, we can add the log probability of each feature given a label:

``` python
for label in ['male','female']:
    for (fname, fval) in gender_features('Solomon').items():  #remember gender_features, our feature extractor from way back when?
        if (label, fname) in feature_probdist:
            feature_probs = feature_probdist[label, fname]
            logprob[label] += feature_probs.logprob(fval)
>>> logprob
{'male': -8.351121452062733, 'female': -11.872635805368294}
```

Now we've fed in the features, and we know that it's significantly less UNlikely (about -8.35 : -11.87) that we have a male name. 

Unfortunately, just when you thought we were out of the woods, NLTK throws us another pesky descendant of ProbDistI, [DictionaryProbDist](https://github.com/nltk/nltk/blob/develop/nltk/probability.py#L529):

``` python
DictionaryProbDist(logprob, normalize=True, log=True)
```

This pretty much just turns our ```logprob``` dict into a ProbDist object, meaning we can use some handy methods on it. Additionally, because 'normalize' and 'log' are set to 'true', we normalize the data. ```Logprob``` gave us 2 numbers, ```log(x)``` and ```log(y)```, and we want to scale them by subtracting ```log(x+y)``` from each of them ([source](https://github.com/nltk/nltk/blob/develop/nltk/probability.py#L1990))<sup id="a2">[2](#f2)</sup>:

``` python
[logx, logy] = logprob.values()
base = min(logx, logy)
sum = base + math.log(2**(logx-base) + 2**(logy-base), 2)
>>> sum
-8.23066330313636

for (x,p) in logprob.items():
    logprob[x] -= sum
>>> logprob
{'male': -0.12045814892637274, 'female': -3.6419725022319334}

```

Now we simply call ```max()``` on this ```DictionaryProbDist``` object, and we have our answer-in this case, 'male'!

### Some Conclusions

We just went through the NaiveBayesClassifier with a fine-toothed comb. The sojourns into the nltk.probability module were a good exercise in grokking object-oriented code, but they probably don't really impact my own use of the class. However, having a general understanding of how my data is transformed and interpreted by NLTK-for instance, how our priors are impacted by the featureset we feed the classifier-is not only a good practice, but will probably influence my choice of features going forward.

       
      

<b id="f1">1</b> Note: <small> _on [l. 220](https://github.com/nltk/nltk/blob/develop/nltk/classify/naivebayes.py#L220) of the Naive Bayes source the label_freqdist is likewise passed through this smoothing apparatus. I'm not quite sure why this is necessary._ </small>[↩](#a1)

<b id="f2">2</b><small> _I was surprised to see that the [sum_logs method](https://github.com/nltk/nltk/blob/develop/nltk/probability.py#L1991) uses ```reduce()```, as it's no longer a built-in function in Python 3. However, they're using the functools version, so everything works equally well in 2.7 or 3._</small> [↩](#a2)
