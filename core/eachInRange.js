/**
 * @module Grue/core/each
 * @author Noah Feldman <nfeldman@nsfdev.com>
 * @copyright 2016
 */

/**
 * Calls a function with each number in a range [start, end).
 * @param  {number}   [start=0] First number in the range.
 * @param  {number}   end First number outside the range.
 * @param  {Function} fn      Function to call with each number.
 * @param  {number} [step=1] Number to increment by.
 * @param  {Object}   [thisObj] Context to call the function in.
 */
module.exports = function (start, end, fn, step, thisObj) {
    if (typeof end == 'function') {
        thisObj = step;
        step = fn;
        fn = end;
        end = start;
        start = 0;
    }

    if (typeof step != 'number' && step !== null) {
        thisObj = step;
        step = 1;
    }

    if (!step)
        step = 1;

    if (thisObj)
        for (var i = start; i < end; i += step)
            !function (i) {
                fn.call(thisObj, i);
            }(i);
    else
        for (var i = start; i < end; i += step)
            !function (i) {
                fn(i);
            }(i);
};
