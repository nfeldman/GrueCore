"use strict";
/**
 * @module Grue/core/Attach
 * Inspired by AOP, this module exports functions to enable subscribing to property changes and
 * function calls of any javascript object.
 *
 * @author Noah Feldman <nfeldman@nsfdev.com>
 * @copyright 2012-2016
 */

var Attach = module.exports;

var GrueSymbol = require('./GrueSymbol'),
    aopId      = GrueSymbol.for('aop_id'),
    grueId     = GrueSymbol.for('grue_id'),
    each       = require('./each'),
    randStr    = require('./randStr'),
    // becomes a map of object ids to a map of before and after callbacks
    connections = null,
    // used to store the original properties that we're wrapping
    attachments = null;

/**
 * Replaces a function property with a wrapper function that will
 * notify zero or more subscribers, invoke the original function, then
 * notify zero or more additional subscribers. Replaces non-function properties
 * with accessors, the setter will notify zero or more subscribers, invoke
 * set the value, then notify zero or more additional subscribers. Replaces
 * accessors with accessors that delegate to the originals, but the setter
 * notifies subscribers before and after doing so.
 *
 * @param  {Object} object Any JS object. In theory, you can use this
 *                         with host objects in modern desktop browsers,
 *                         but you probably shouldn't.
 * @param  {string} name   Name of a property of the object.
 * @private
 */
function attach (object, name) {
    !attachments && (attachments = Object.create(null));
    !connections && (connections = Object.create(null));

    var id = object[grueId] || object[aopId] || (Object.defineProperty(object, aopId, {
            value: randStr(8, 'ao'),
            writable: true,
            configurable: true
        }), object[aopId]),
        descriptor = Object.getOwnPropertyDescriptor(object, name);

    !connections[id] && (connections[id] = Object.create(null));
    !attachments[id] && (attachments[id] = Object.create(null));

    if (attachments[id][name])
        return id;

    attachments[id][name] = descriptor;
    connections[id][name] = Object.create(null);

    if (!descriptor.configurable)
        throw new Error('Unable to subscribe to "' + name + '", the property cannot be modified');

    if ('value' in descriptor) {
        if (typeof descriptor.value == 'function') {
            attachToFn(object, name, id, descriptor);
        } else {
            attachAsSetter(object, name, id, descriptor);
        }
    } else {
        if (typeof descriptor.set != 'function')
            return console.warn('Property "' + name + '" is not settable.'), id;

        attachWrapSetter(object, name, id, descriptor);
    }

    return id;
}

/**
 * Creates a getter and setter for a non-function property of an object and fires events from the setter.
 * @param  {Object} object Any object.
 * @param  {string} name   Name of a property of the object.
 * @param  {string} id     Object id for the purpose of observing it.
 * @param {Object} descriptor The property descriptor.
 * @private
 */
function attachAsSetter (object, name, id, descriptor) {
    Object.defineProperty(object, name, {
        get: function () {
            return descriptor.value;
        },
        set: function (next) {
            var curr = descriptor.value;

            notify(id, name, 'before', [curr, next]);

            descriptor.value = next;

            notify(id, name, 'after', [/*prev:*/curr, /*curr:*/next]);
        }
    });
}

/**
 * Wraps an existing setter property of an object with one that notifies subscribers
 * before and after invoking the replaced setter.
 * @param {Object} object Any object.
 * @param {string} name   Name of a property of the object.
 * @param {string} id     Object id for the purpose of observing it.
 * @param {Object} descriptor The property descriptor.
 * @private
 */
function attachWrapSetter (object, name, id, descriptor) {
    Object.defineProperty(object, name, {
        get: descriptor.get ? descriptor.get.bind(object) : nop,
        set: function (next) {
            var curr = descriptor.get.call(object);
            notify(id, name, 'before', [curr, next]);

            descriptor.set.call(object, next);

            notify(id, name, 'after', [/*prev:*/curr, /*curr:*/next]);
        }
    });
}

/**
 * Replaces a function property of an object with one that notifies subscribers
 * before and after invoking the replaced function.
 * @param  {Object} object Any object.
 * @param  {string} name   Name of a property of the object.
 * @param  {string} id     Object id for the purpose of observing it.
 * @param {Object} descriptor The property descriptor.
 */
function attachToFn (object, name, id, descriptor) {
    var fn = descriptor.value;

    object[name] = function () {
        var args = [],
            ret;

        for (var i = 0; i < arguments.length; i++)
            args[i] = arguments[i];

        // should there be an "around" that is able to replace the function arguments?
        notify(id, name, 'before', args);

        ret = fn.apply(object, args);

        if (connections[id][name].after && connections[id][name].after.length)
            notify(id, name, 'after', args);

        return ret;
    };
}

/**
 * A shortcut to unhook all listeners from a given function or to restore all
 * wrapped functions in a given object.
 *
 * @param  {Object} object
 * @param  {string} name   The name of a wrapped object property to restore.
 */
Attach.detach = function (object, name) {
    var id = object[grueId] || object[aopId];

    if (name) {
        Object.defineProperty(object, name, attachments[id][name]);
        delete attachments[id][name];
        delete connections[id][name];
        return;
    }

    each(attachments[id], function (_, name) {
        Attach.detach(object, name);
    });

    if (!Object.keys(attachments[id]).length) {
        if (id == object[aopId])
            delete object[aopId];

        delete attachments[id];
        delete connections[id];
    }
};

/**
 * Add a listener to a property of an object.
 * @param  {('before'|'after')}   position When to notify the subscriber, before
 *                                         or after the property is invoked, if
 *                                         a function, or changed, if not.
 * @param  {Object}   object   The object containing the property to observe.
 * @param  {string}   name     The property name.
 * @param  {Function} callback The function to invoke before or after the
 *                             property function is invoked or non-function
 *                             property value is set.
 * @param  {Object}   [thisObj=object] The `this` of the callback. Pass null to
 *                                     have no context.
 * @return {Function}  Disconnect function. Call to remove the current listener.
 * @private
 */
function connect (position, object, name, callback, thisObj) {
    var id = attach(object, name),
        list;

    list = connections[id][name][position] || (connections[id][name][position] = []);

    if (thisObj === undefined)
        thisObj = object;

    list.push([callback, thisObj]);

    return function () {
        disconnect(position, id, name, callback);
    };
}

/** @private */
function disconnect (position, id, name, fn) {
    var list = connections[id] && connections[id][name] && connections[id][name][position];

    if (!(list && list.length))
        return;

    for (var i = 0; i < list.length; i++)
        if (list[i][0] == fn)
            break;

    if (i < list.length)
        list.splice(i, 1);
}

/**
 * Either call an arbitrary function with the arguments intended for the
 * function property of some object before invoking that function property, or
 * with the current and next value of a non-function property of some object.
 *
 * @param  {Object}   object   The object containing the property to observe.
 * @param  {string}   name     The property name.
 * @param  {Function} callback The function to invoke before the property
 *                             function is invoked or non-function property
 *                             value is set.
 * @param  {Object}   [thisObj=object] The `this` of the callback. Pass null to
 *                                     have no context.
 * @return {Function} A function to call to remove the listener.
 */
Attach.before = function (object, name, callback, thisObj) {
    return connect('before', object, name, callback, thisObj);
};

/**
 * Either call an arbitrary function with the arguments intended for the
 * function property of some object and its return value after invoking that
 * function, or with the current and previous value of a non-function property
 * of some object.
 *
 * @param  {Object}   object   The object containing the property to observe.
 * @param  {string}   name     The property name.
 * @param  {Function} callback The function to invoke after the property
 *                             function is invoked or non-function property
 *                             value is set.
 * @param  {Object}   [thisObj=object] The `this` of the callback. Pass null to
 *                                     have no context.
 * @return {Function}  A function to call to remove the listener.
 */
Attach.after = function (object, name, callback, thisObj) {
    return connect('after', object, name, callback, thisObj);
};

/**
 * Notify observers of some object property that the property is/was
 * invoked/changed.
 * @param  {string} id       Identifies the relevant object.
 * @param  {string} name     Identifies the relevant property.
 * @param  {('before'|'after')} position Identifies the collection of observers
 *                                       to notify.
 * @param  {Array} args     The arguments to pass to the listener(s). If the
 *                          property is a function, these are the arguments the
 *                          function was or will be called with. If the property
 *                          isn't a function, these are either the current and
 *                          next value or the current and previous value of the
 *                          property.
 * @private
 */
function notify (id, name, position, args) {
    var list = connections[id] && connections[id][name] && connections[id][name][position];

    if (!list || !list.length)
        return;

    for (var i = 0; i < list.length; i++) {
        try {
            list[i][0].apply(list[i][1], args);
        } catch (e) {
            console.warn(e);
        }
    }
};
