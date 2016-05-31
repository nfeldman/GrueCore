/**
 * @fileOverview This is not a polyfill for Symbol and must be used with great care. For example, any time a GrueSymbol
 *               is used as a property name, that property should not be enumerable. The private registry is to share
 *               Symbols internally. The global Symbol registry provided by the spec is just weird.
 */

var HAS_SYMBOLS = require('./features').symbols,
    randStr = require('./randStr'),
    registry = Object.create(null);

module.exports = GrueSymbol;

function GrueSymbol (name) {
    return HAS_SYMBOLS ? Symbol(name) : randStr(8, '__grue$' + name + '_');
}

GrueSymbol.for = function (name) {
    if (name in registry)
        return registry[name];

    var sym = GrueSymbol(name);
    registry[name] = sym;

    return sym;
};

GrueSymbol.hasOwnSymbol = function (obj, nameOrSymbol) {
    return name in registry ? obj.hasOwnProperty(registry[name]) : obj.hasOwnProperty(name);
};
