/**
 * @module Grue/core/mixin
 * @author Noah Feldman <nfeldman@nsfdev.com>
 * @copyright 2012-2016
 */
module.exports = mixin;

var mix = require('./mix');

/**
 * Like mixin or extend in any one of a hundred libraries, and unlike mix, takes a sink and one or more sources.
 * Be careful, it will clobber pre-existing properties.
 * @param {Object} sink Object into which to mix the target properties.
 * @param {...Object} source One or more objects from which to copy properties.
 * @return {Object} sink
 */
function mixin (sink) {"use strict";
    var len = arguments.length,
        params = new Array(len - 2);

    for (var i = 1; i < len; i++)
        params[i - 1] = arguments[i];

    return params.reduce(function (sink, source) {
        mix(source, sink);
        return sink;
    }, sink);
}
