/**
 * @module Grue/core/mix
 * @author Noah Feldman <nfeldman@nsfdev.com>
 * @copyright 2012-2016
 */
module.exports = mix;

var hasOwn  = {}.hasOwnProperty,
    toStr   = {}.toString;

function clone (source) {
    var value;
    if (Array.isArray(source)) {
        value = new Array(source.length);
        for (var i = 0, l = value.length; i < l; i++) {
            if (typeof source[i] == 'object') {
                if (~toStr.call(source[i]).slice(8, -1).indexOf('HTML')) {
                    value[i] = source[i].cloneNode(true);
                } else {
                    value[i] = mix(true, source[i], {});
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

/**
 * Mixes or merges or clones
 * @param  {boolean} [deep=false] when properties are arrays or objects, should
 *                                we clone the thing pointed at?
 * @param  {Object} source   Object from which properties are copied
 * @param  {Object} [target={}|[]]  Object or Array to which properties (or
 *                                  values) are copied, if undefined, an empty
 *                                  Object or Array (depending on the type of
 *                                  the source) is used
 * @param  {boolean} [preserve=false] whether to preserve properties of the
 *                                    target if a property of the same name
 *                                    exists in the source
 *
 * @return {Object} target
 */
function mix (deep, source, target, preserve) {
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
        target = Array.isArray(source) ? [] : {};

    if (Array.isArray(source)) {
        for (var i = 0, l = source.length; i < l; i++)
            mix(deep, source[i], target, preserve);
        return target;
    }

    var keys = Object.getOwnPropertyNames(source),
        i    = 0,
        l    = keys.length,
        descriptor;

    if (preserve) {
        for (; i < l; i++) {
            if (hasOwn.call(target, keys[i]))
                continue;

            if (deep && source[keys[i]] !== null && typeof source[keys[i]] == 'object') {
                descriptor = Object.getOwnPropertyDescriptor(source, keys[i]);
                descriptor.value = clone(source[keys[i]]);
                Object.defineProperty(target, keys[i], descriptor);
            } else {
                Object.defineProperty(target, keys[i], Object.getOwnPropertyDescriptor(source, keys[i]));
            }
        }
    } else {
        for (; i < l; i++) {
            if (deep && source[keys[i]] !== null && typeof source[keys[i]] == 'object') {
                if (hasOwn.call(target, keys[i])) {
                    mix(deep, source[keys[i]], target[keys[i]]);
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
