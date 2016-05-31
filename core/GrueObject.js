/**
 * @module Grue/core/GrueObject
 * @author Noah Feldman <nfeldman@nsfdev.com>
 * @copyright 2016
 */
module.exports = GrueObject;

var randStr = require('./randStr'),
    GrueSymbol = require('./GrueSymbol'),
    grueId = GrueSymbol.for('grue_id'),
    destroyed = GrueSymbol.for('destroyed'),
    destroying = GrueSymbol.for('destroying');

function GrueObject () {
    Object.defineProperty(this, grueId, {value: randStr(8, 'gr')});
    Object.defineProperty(this, destroyed, {value: false, configurable: true});
    Object.defineProperty(this, destroying, {value: false, configurable: true});
}

GrueObject.prototype.tap = function (fn) {
    fn.call(this);
    return this;
};

GrueObject.augment = function (target) {
    if (!target || typeof target != 'object')
        throw new Error('cannot add Grue standard properties to ' + typeof target);

    GrueObject.call(target);
    return target[grueId];
};
