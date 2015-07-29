var mix = require('./mix');

/**
 * Provides implementation inheritance while preserving constructor semantics.
 * Adds a reference to super as __ctor__ on the subConstructor as a static
 * property. Uses Object.create.
 * @param {Function} SubC   The constructor for the subtype, if it is a named
 *                          function, the intermediary constructor will share
 *                          its name.
 * @param {Function} SuperC The constructor for the supertype
 * @return {undefined}
 * 
 * @alias module:Grue/OO/inherit
 */
module.exports = function (SubC, SuperC) {
    var subProto = Object.create(SuperC.prototype);
    mix(SubC.prototype, subProto);
    SubC.prototype = subProto;
    SubC.prototype.constructor = SubC;
    SubC.__ctor__ = SuperC;
};
