/**
 * @module Grue/core/mix
 * @author Noah Feldman <nfeldman@nsfdev.com>
 * @copyright 2012-2016
 */
module.exports = mix;

var hasOwn  = {}.hasOwnProperty,
    toStr   = {}.toString;

/**
 * Mixes or merges or clones. Either pass a single configuration object or the following arguments. The configuration
 * object may have the option 'skipNonEnumerable'.
 * @param  {boolean} [deep=false] when properties are arrays or objects, should we clone the thing pointed at?
 * @param  {Object} source   Object from which properties are copied.
 * @param  {Object} [target={}|[]]  Object or Array to which properties (or values) are copied, if undefined, an empty
 *                                  Object or Array (depending on the type of the source) is used.
 * @param  {boolean} [preserve=false] Whether to preserve properties of the target if a property of the same name
 *                                    exists in the source
 *
 * @return {Object} target
 */
function mix (deep, source, target, preserve) {
    var options, skip;

    if (arguments.length == 1 && typeof deep == 'object') {
        var options = deep;
        deep = !!options.deep;
        source = options.source;
        target = options.target || Array.isArray(source) ? [] : 'constructor' in source ? {} : Object.create(null);
        preserve = options.preserve;
        skip = options.skipNonEnumerable;
    } else {
        skip = false;
        if (typeof deep != 'boolean') {
            preserve = target;
            target   = source;
            source   = deep;
            deep     = false;
        }

        if (typeof target == 'boolean') {
            preserve = target;
            target   = null;
        }

        if (target == null)
            target = Array.isArray(source) ? [] : 'constructor' in source ? {} : Object.create(null);
    }

    if (Array.isArray(source)) {
        if (skip) {
            for (var i = 0; i < source.length; i++)
                mix({
                    deep: deep,
                    source: source[i],
                    target: target,
                    preserve: preserve,
                    skipNonEnumerable: true
                });
        } else {
            for (var i = 0; i < source.length; i++)
                mix(deep, source[i], target, preserve);
        }

        return target;
    }

    var keys = skip ? Object.keys(source) : Object.getOwnPropertyNames(source),
        i    = 0,
        l    = keys.length,
        descriptor;

    if (preserve) {
        for (; i < l; i++) {
            if (hasOwn.call(target, keys[i]))
                continue;

            if (deep && source[keys[i]] !== null && typeof source[keys[i]] == 'object') {
                descriptor = Object.getOwnPropertyDescriptor(source, keys[i]);
                descriptor.value = clone(source[keys[i]], skip);
                Object.defineProperty(target, keys[i], descriptor);
            } else {
                Object.defineProperty(target, keys[i], Object.getOwnPropertyDescriptor(source, keys[i]));
            }
        }
    } else {
        for (; i < l; i++) {
            if (deep && source[keys[i]] !== null && typeof source[keys[i]] == 'object') {
                if (hasOwn.call(target, keys[i])) {
                    skip ? mix({
                        deep: deep,
                        source: source[keys[i]],
                        target: target[keys[i]],
                        preserve: preserve,
                        skipNonEnumerable: true
                    }) : mix(deep, source[keys[i]], target[keys[i]], preserve);
                } else {
                    descriptor = Object.getOwnPropertyDescriptor(source, keys[i]);
                    descriptor.value = clone(source[keys[i]]);
                    Object.defineProperty(target, keys[i], descriptor);
                }
            } else {
                Object.defineProperty(target, keys[i], Object.getOwnPropertyDescriptor(source, keys[i]));
            }
        }
    }

    return target;
}

function clone (source, skipNonEnumerable) {
    var value;
    if (Array.isArray(source)) {
        value = new Array(source.length);
        for (var i = 0; i < value.length; i++) {
            if (typeof source[i] == 'object') {
                if (~toStr.call(source[i]).slice(8, -1).indexOf('HTML')) {
                    value[i] = source[i].cloneNode(true);
                } else {
                    value[i] = skipNonEnumerable ? mix({
                        deep: true,
                        source: source[i],
                        skipNonEnumerable: true
                    }) : mix(true, source[i]);
                }
            } else {
                value[i] = source[i];
            }
        }
    } else {
        value = mix(true, source, {});
    }
    return value;
}
