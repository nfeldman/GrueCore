/**
 * @module Grue/core/each
 * @author Noah Feldman <nfeldman@nsfdev.com>
 * @copyright 2012-2016
 */

module.exports = each;

/**
 * Similar to [].forEach, but ducktypes and works on objects.
 * With objects, it will only iterate over enumerable own properties.
 *
 * @param  {Object|Array|?}   it   Can be a plain JS object, array, or thing  looks array like
 *                                 (e.g. collections in the DOM)
 * @param  {Function(value, key, index)}   callback   Called once for each value. Return
 *                                                    `each.breaker` to break out of the iteration.
 * @param  {Object}   [thisObj]   If supplied, becomes the `this` of the callback
 * @return {undefined}
 */
function each (it, callback, thisObj) {
    var i, l, keys, r;

    if (typeof it.length == 'number') {
        if (thisObj) {
            for (i = 0, l = it.length; i < l; i++) {
                r = callback.call(thisObj, it[i], i, i);
                if (r && r == each.breaker)
                    return;
            }
        } else {
            for (i = 0, l = it.length; i < l; i++) {
                r = callback(it[i], i, i);
                if (r && r == each.breaker)
                    return;
            }
        }
    } else {
        keys = Object.keys(it);
        if (thisObj) {
            for (i = 0, l = keys.length; i < l; i++) {
                r = callback.call(thisObj, it[keys[i]], keys[i], i);
                if (r && r == each.breaker)
                    return;
            }
        } else {
            for (i = 0, l = keys.length; i < l; i++) {
                r = callback(it[keys[i]], keys[i], i);
                if (r && r == each.breaker)
                    return;
            }
        }
    }
}

// attempt to prevent the breaker object being modified or replaced
Object.defineProperty(each, 'breaker', {value: {}});
if ('freeze' in Object)
    Object.freeze(each.breaker);


