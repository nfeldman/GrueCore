/**
 * @module Grue/core/randStr
 * @author Noah Feldman <nfeldman@nsfdev.com>
 * @copyright 2012-2016
 */

var h = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Creates random mixed case alphanumeric strings
 *
 * @param  {number} [length=8] How long a random string to return.
 * @param  {string} [prefix=''] Optional prefix.
 * @return {[string}        A random mixed case alphanumeric string
 */
module.exports = function randStr (length, prefix) {
    var s, i;

    !prefix && typeof length == 'string' && (prefix = length, length = 8);
    !length && (length = 8);
    s = prefix ? [prefix] : [];
    i = s.length;

    for (; i < length; i++)
        s[i] = h.charAt(~~(Math.random() * 62));

    return s.join('');
};
