# Grue Core

I've written 3 or 4 general purpose JavaScript libraries over the years. In 2012 and 2013 I wrote a framework that I called Grue, based on a library I'd named Fortinbras which was itself a rewrite of another library named Grue. I never released it, and aside from a Tetris clone, never used it for anything. This is not that Grue; but it is a small collection of core files from that Grue, along with miscellaneous others that someone other than myself might find useful.

Grue was a library/framework that went through a great deal of effort to ensure it worked with IE 8 and below. These files mostly assume an ECMAScript 5.1 environment. 

# NOTE
This repo is a WIP. When I've added all the files I think of as "core" to Grue and had a chance to verify that I have not introduced any bugs in the process, I will publish this module on npm and remove this message.


## each
Similar to [].forEach, but will happily iterate over both js objects and arrays as well as anything you would normally loop over, like dom collections. Because it iterates over object properties, the callback parameters are the current value, the current key or index, and the current index. Like [].forEach, you may supply a `this` object. Unlike [].forEach, you can break out of an iteration by returning `each.breaker` from the callback.

## inherit
A simple utility to preserve constructor semantics but keep the prototype chain setup correctly. Inheritance is a useful tool and, unlike some languages, using JavaScript's single inheritance doesn't have any real downsides -- creating "types" is mostly useful for debugging (although there are occassions where the use of instanceof can simplify your code) and doesn't prevent mixing whatever else you need into your objects (whether those are instances of a "class" or prototypes). 

## mix
Takes a source and a sink, in that order, which is the opposite of most mixin functions. There are a few reasons for this:

 1. It reads more naturally -- you mix chips into cookie dough, not cookie dough into chips 
 2. It makes it easier to overload, at the small cost of violating a (mostly useless) convention
 3. When using various other mixin functions, I almost never have occassion to provide a list of objects to mix into the sink

Unlike every other mixin function I've seen, this one copies the property descriptors of the source properties, not just the value.

As a general rule, I try to avoid overloading functions in any language because it can get confusing, but for `mix` I make an exception.

```mix (boolean: deep=false, object: source, object: target={}, boolean: preserve=false) -> target```

`mix` can clone or deep clone an object. It can copy properties of one object into another. It can copy properties of one object into another recursively (i.e. if the same object property exists in the source and the target, it merges the one into the other). And it can mix or merge addatively (i.e. if there's a source.foo and a target.foo, you can tell it not to replace target.foo).

## EventEmitter
Yet another event emitter. 
