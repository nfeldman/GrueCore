/**
 * @module Grue/core/types
 * @author Noah Feldman <nfeldman@nsfdev.com>
 * @copyright 2012-2016
 */

// Sometimes, you really need to know exactly what type you're dealing with.
// This usually means your not thinking the way JS wants you to think, but it does happen.

// map internal [[Class]] to simplified names for type checking. This is by no means exhuastive
var nativeClasses = exports.nativeClasses = {
        '[object Object]': 'object',
        '[object Null]'  : 'null',
        '[object Array]' : 'array',
        '[object Date]'  : 'date',
        '[object String]': 'string',
        '[object Number]': 'number',
        '[object RegExp]': 'regexp',
        '[object Function]' : 'function',
        '[object Undefined]': 'undefined',
        '[object NamedNodeMap]': 'NamedNodeMap',
        '[object NodeList]': 'NodeList',
        '[object HTMLCollection]': 'HTMLCollection'
    },

// Add the standard is{[type]} functions. RegExp is not a native type and in
// some browsers (chrome... 1-12, others?) is considered a function. Be careful.
    toStr = {}.toString;

'Object Array Date Number RegExp String Number Function Undefined Null'.split(' ').forEach(function (type) {
    typename = type.toLowerCase();
    exports['is' + type] = function (thing) {
        return nativeClasses[toStr.call(thing)] == typename;
    };
});

exports.isNaN = (function (thing) {
    // built in isNaN will return false for isNaN(null) and true for isNaN(undefined)
    return thing === null || +thing !== +thing;
});

exports.isInt = function (thing) {
    return exports.isNaN(thing) ? false : String(thing).indexOf('.') == -1;
};

exports.isFloat = exports.isDouble = function (thing) {
    // NB: 1.0 becomes 1, so this is only really reliable on strings
    return !!(thing !== null && +thing == +thing && String(thing).indexOf('.') != -1);
};
