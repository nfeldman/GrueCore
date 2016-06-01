/**
 * Exports functions to observe an object for changes. Does not follow the now defunct Object.observe API.
 *
 * @module Grue/core/Observe
 * @author Noah Feldman <nfeldman@nsfdev.com>
 * @copyright 2012-2016
 */

/**
 * @fileOverview
 *
 * This is an experiment to see if there is a reasonably efficient way to create a simple observable object from a
 * plain javascript object. Given an object, it returns an observable that acts as a proxy for that object. Getting
 * and setting properties on the returned observable will pass through to the same properties of the observed, provided
 * those properties existed at the time #observe was first called. One or more subscribers is notified each time one of
 * these properties changes. If the property is a function, subscribers are notified that the function has been called
 * and the arguments with which it was called. Properties of Object properties are subscribed to automatically, as are
 * properties of Array properties. Individual array values are not converted to observables, meaning changes to an
 * object within an array of objects will not cause subscribers to array changes to be notified.
 *
 * For selectively observing a small subset of properties on an object, it may be more convenient to use
 * Grue/core/Eventing/EventEmitter#before or Grue/core/Eventing/EventEmitter#after
 *
 * TODO Benchmark this vs something like dirty checking.
 */

var randStr = require('./randStr'),
    GrueSymbol = require('./GrueSymbol'),
    grueId     = GrueSymbol.for('grue_id'),
    obsId      = GrueSymbol.for('obs_id'),
    obsTarget  = GrueSymbol.for('obs_target'),
    obsList    = GrueSymbol.for('obs_list'),
    obsOwner   = GrueSymbol.for('obs_owner'),
    each        = require('./each'),
    eachInRange = require('./eachInRange'),
    copy        = require('./copy'),
    mix         = require('./mix'),
    hasOwn      = Function.prototype.call.bind({}.hasOwnProperty),
    toStr       = Function.prototype.call.bind({}.toString),

    arrayProps = Object.getOwnPropertyNames(Array.prototype).filter(function (name) {return name != 'constructor'}),
    proxyArrayProto = Object.create(null),

    regisitry = Object.create(null);

// set up the prototype for all array proxy objects
each(arrayProps, function (prop) {
    if (typeof [][prop] == 'function') {
        this[prop] = function () {
            var prev = this[obsTarget].slice(0),
                args = [],
                prevLength = prev.length,
                ret, currLength;

            for (var i = 0; i < arguments.length; i++)
                args.push(arguments[i]);

            ret = [][prop].apply(this[obsTarget], arguments);
            currLength = this[obsTarget].length;

            updateArrayProxy(this);

            notify(this[obsList], prop, 'call', {
                type: 'arrayMethod',
                name: prop,
                prev: prev,
                args: args,
                curr: this[obsTarget].slice(0)
            });

            prevLength != currLength && notify(this[obsList], 'length', 'change', {
                type: 'literalProperty',
                name: 'length',
                prev: prevLength,
                curr: currLength
            });

            return ret;
        };
    } else {
        Object.defineProperty(this, prop, {
            get: function () {
                return this[obsTarget][prop];
            },
            set: function (value) {
                var prev = this[obsTarget][prop];
                this[obsTarget][prop] = value;

                notify(this[obsList], prop, 'change', {
                    type: 'literalProperty',
                    name: prop,
                    prev: prev,
                    curr: value
                });
            }
        });
    }
}, proxyArrayProto);

// The tricky part of this is dealing with arrays.
function updateArrayProxy (proxy) {
    eachInRange(0, proxy.length, function (i) {
        Object.defineProperty(proxy, i, {
            get: function () {
                return proxy[obsTarget][i];
            },
            set: function (curr) {
                var prev = proxy[obsTarget][i];
                proxy[obsTarget][i] = prev;
                notify(proxy[obsList], i, 'change', {
                    index: i,
                    prev: prev,
                    curr: curr,
                    type: 'arrayValue'
                });
            },
            configurable: true
        });
    });
}

/**
 * Observe changes in an object. Returns a "proxy" object, setting existing properties on
 * it will cause the property on the underlying object to be set. #observe may be applied
 * to the object returned by an initial call to #observe in order to observe properties
 * added after the first call.
 *
 * @param  {Object}   object     The object to observe.
 * @param  {Function} [callback] A fnction called whenever any property changes.
 * @return {Object} A proxy object with the same properties as the original and an addition "observe" method.
 *                    Calling proxy.observe([property,] callback) adds the callback to the collection of functions
 *                    called whenever either the specified property or, if no property is supplied, any property of
 *                    the observable is changed or invoked, in the case of function properties.
 */
exports.getObservable = function (object, callback) {
    return observe(object, callback);
};


/**
 * Observe changes in an object. Returns a "proxy" object, setting existing properties on
 * it will cause the property on the underlying object to be set. #observe may be applied
 * to the object returned by an initial call to #observe in order to observe properties
 * added after the first call.
 *
 * @param  {Object}   object     The object to observe.
 * @param  {string}   [property] A specific property of the object, if used, a callback must be provided
 * @param  {Function} [callback] Function called whenever a property changes,
 *                               if no property name is provided, will be called
 *                               when any property changes.
 * @return {Object} A proxy object.
 * @private
 */
function observe (object, property, callback) {
    if (typeof object != 'object')
        throw new TypeError('observe cannot be applied to type ' + toStr(object).slice(8, -1) + '.');

    if (Object.isFrozen && Object.isFrozen(object))
        throw new Error('Cannot observe changes in frozen objects.');

    var id = object[grueId] || object[obsId] || (Object.defineProperty(object, obsId, {
            value: randStr(8, 'ob'),
            writable: true,
            configurable: true
        }), object[obsId]),
        observed  = regisitry[id]      || (regisitry[id] = Object.create(null)),
        observers = observed.observers || (observed.observers = Object.create(null)),
        original  = observed.original  || (observed.original  = object),
        proxy;

    if (observed.proxy) {
        proxy = observed.proxy;
    } else {
        proxy = (Array.isArray(object) && (observed.proxy = Object.create(proxyArrayProto, (function () {
            var properties = {observe: {value: obFn}};
            properties[grueId in object ? grueId : obsId] = {value: id};
            properties[obsList] = {value: observers};
            properties[obsTarget] = {value: object};
            return properties;
        }()))) || (observed.proxy = (object[grueId] || object[obsId]) ?
            Object.create(object, {observe: {value: obFn}}) : Object.create(object, (function() {
                var properties = {observe: {value: obFn}};
                properties[grueId in object ? grueId : obsId] = {value: id};
                return properties;
            }()))));

        if (Array.isArray(object))
            updateArrayProxy(proxy);
    }

    if (!callback && typeof property == 'function') {
        callback = property;
        property = null;

        if (!observers.__grue_all)
            observers.__grue_all = [];

        observers.__grue_all.push(callback);

        if (!Array.isArray(original)) {
            each(original, function (v, k) {
                defineObservedProperty.call(proxy, k, original, observers);
            });
        }
    } else if (typeof property == 'string') {
        defineObservedProperty.call(proxy, property, original, observers);
        !observers[property] && (observers[property] = []);
        observers[property].push(callback);
    }

    return proxy;
};

/**
 * Returns an object that had been observed and attempts to cleanup.
 * @param  {Object} object A proxy object returned by `observe`
 * @return {Object} The original object that was being observed.
 */
exports.unobserve = function (object) {
    var id = object[grueId] || object[obsId],
        original = id && regisitry[id] && regisitry[id].original;

    if (!original) {
        console.warn('trying to unobserve object that was not under observation.');
        return object;
    }

    // Before we delete the proxy, copy any properties found in it that do not exist in the original.
    mix({deep: true, source: regisitry[id].proxy, target: original, skipNonEnumerable: true});

    each(regisitry[id].observers, function (value, key) {
        delete regisitry[id].observers[key];
    });

    setImmediate(function () {delete regisitry[id]});

    return original;
};

/** @private */
function defineObservedProperty (prop, original, observers) {
    if (hasOwn(this, prop))
        return;

    var id, observed, observeProp;

    if (typeof original[prop] == 'object') { // JS collections
        id = original[grueId] || original[obsId];
        observed = regisitry[id];
        if (Array.isArray(original[prop])) {
            observeProp = function () {
                observed[prop] = observe(original[prop], function (name, detail) {
                    var msg = copy(detail);
                    msg.name = prop +  (detail.name ? '.' + detail.name : '[' + detail.index + ']');
                    notify(observers, prop, name, msg);
                });
            };
            observeProp();

            Object.defineProperty(this, prop, {
                get: function () {
                    return observed[prop];
                },
                set: function (value) {
                    var prev = original[prop];
                    original[prop] = value;
                    observeProp();
                    notify(observers, prop, 'change', {
                        type: 'arrayProperty',
                        name: prop,
                        prev: prev,
                        curr: value
                    });
                },
                configurable: true
            });
        } else {
            observeProp = function () {
                observed[prop] = observe(original[prop], function (name, detail) {
                    var event = prop + '.' + detail.name,
                        msg = {
                            type: 'objectProperty',
                            name: event,
                            prev: detail.prev,
                            curr: detail.curr
                        };
                    notify(observers, prop, 'change', msg);
                    notify(observers, event, 'change', msg, true);
                });
            }
            observeProp();
            Object.defineProperty(this, prop, {
                get: function () {
                    return observed[prop];
                },
                set: function (value) {
                    var prev = original[prop];
                    original[prop] = value;
                    observeProp();
                    notify(observers, prop, 'change', {
                        type: 'objectProperty',
                        name: prop,
                        prev: prev,
                        curr: value
                    });
                },
                configurable: true
            });
        }
    } else if (typeof original[prop] == 'function') { // shrug
        this[prop] = function () {
            var args = [];
            for (var i = 0; i < arguments.length; i++)
                args.push(arguments[i]);
            original[prop].apply(original, arguments);
            notify(observers, prop, 'call', {
                type: 'functionProperty',
                name: prop,
                args: args
            });
        };
    } else { // literal values
        Object.defineProperty(this, prop, {
            get: function () {
                return original[prop];
            },
            set: function (value) {
                var prev = original[prop];
                original[prop] = value;
                notify(observers, prop, 'change', {
                    type: 'literalProperty',
                    name: prop,
                    prev: prev,
                    curr: value
                });
            }
        });
    }
}

/** @private */
function notify (observers, property, eventName, eventDetail, onlyDirectListeners) {
    if (!(observers[property] && observers[property].length || observers.__grue_all && observers.__grue_all.length))
        return;

    for (var i = 0, l = observers[property] && observers[property].length || 0; i < l; i++)
        observers[property][i](eventName, eventDetail);

    if (!onlyDirectListeners && observers.__grue_all && observers.__grue_all.length)
        for (var i = 0, l = observers.__grue_all.length; i < l; i++)
            observers.__grue_all[i](eventName, eventDetail);
}


// -- helper -- generic method applied by the proxy objects the observe
// function creates.
/** @private */
function obFn (property, callback) {
    observe(this, property, callback);
    return this;
}
