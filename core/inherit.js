var mix = require('./mix');
/**
 * @module Grue/core/inherit
 * @author Noah Feldman <nfeldman@nsfdev.com>
 * @copyright 2012-2016
 */

/**
 * Provides implementation inheritance while preserving constructor semantics.
 * 
 * @param {Function} SubC   The constructor for the subtype, if it is a named
 *                          function, the intermediary constructor will share
 *                          its name.
 * @param {Function} SuperC The constructor for the supertype
 */
module.exports = function inherit (SubC, SuperC) {
    var subProto = Object.create(SuperC.prototype);
    mix(SubC.prototype, subProto);
    SubC.prototype = subProto;
    SubC.prototype.constructor = SubC;
};
