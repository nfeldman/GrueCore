/**
 * @module Grue/core/Eventing/EventEmitter
 * @author Noah Feldman <nfeldman@nsfdev.com>
 * @copyright 2012-2016
 */

var GrueObject = require('./../GrueObject'),
    GrueSymbol = require('./../GrueSymbol'),
    inherit    = require('./../inherit'),
    randStr    = require('./../randStr'),
    each       = require('./../each'),
    Event      = require('./Event'),
    hasOwn     = Function.prototype.call.bind({}.hasOwnProperty),

    eventHandlers = GrueSymbol.for('event_handlers'),
    offFuncs      = GrueSymbol.for('off_funcs'),
    destroyed     = GrueSymbol.for('destroyed'),
    destroying    = GrueSymbol.for('destroying'),
    grueId = GrueSymbol.for('grue_id'),

    nop = function () {};

module.exports = EventEmitter;

// creates a global setImmediate if one does not already exist
require('setimmediate');

/**
 * Provides an easy way to setup communication between objects.
 *
 * @constructor
 */
function EventEmitter () {
    GrueObject.call(this);
    Object.defineProperty(this, eventHandlers, {value: Object.create(null), configurable: true});
    Object.defineProperty(this, offFuncs, {value: null, configurable: true});
}
inherit(EventEmitter, GrueObject);

/**
 * Call a callback when an event fires.
 *
 * @param  {string}   event  Name of the event to listen on.
 * @param  {Function} callback  Function to call when the event fires.
 * @param  {Object}   [thisObj=this]  Object to use as the callback's `this`. Pass null to set `this` to undefined
 *
 * @return {Function} off  Call to remove the event listener.
 */
EventEmitter.prototype.on = function (event, callback, thisObj) {
    if (~event.indexOf(' '))
        return (function () {
            var offs = event.split('\s+').map(function (e) {return this.on(e, callback, thisObj)}, this);

            return function () {
                for (var i = 0; i < offs.length; i++)
                    doInTryCatch(offs[i]);
            };
        }.call(this));

    if (this[destroying] || this[destroyed])
        return console.warn('Attempted to add an event listener to a destroyed object'), nop;

    var events = this[eventHandlers][event] || (this[eventHandlers][event] = []),
        fn, off, offs;

    if (!callback)
        throw Error('No event handler supplied');

    if (thisObj === undefined)
        fn = callback.bind(this);
    else if (thisObj === null)
        fn = function () {"use strict"; return callback.apply(undefined, arguments)};
    else
        fn = callback.bind(thisObj);

    off = function () {
        this.off([event, fn]);

        if (this[destroying] || this[destroyed])
            return;

        offs = this[offFuncs];
        for (var i = 0; i < offs.length; i++) {
            if (offs[i] == off) {
                offs[i](i, 1);
                break;
            }
        }
    }.bind(this);

    !this[offFuncs] && Object.defineProperty(this, offFuncs, {value: []});
    this[offFuncs].push(off);

    events.push(fn);

    off.event = event;
    return off;
};


/**
 * Like EventEmitter#on, but the handler is only invoked once.
 *
 * @param {string}   event     the type of event to listen for, e.g. 'change'
 * @param {Function} callback  function to call when the event fires
 * @param {Object}   [thisObj=this] context in which to call the callback
 * @return {Function} off call to remove the event listener
 */
EventEmitter.prototype.once = function (event, callback, thisObj) {
    if (this[destroying] || this[destroyed])
        return console.warn('Attempted to add an event listener to a destroyed object'), nop;

    var that = this, off;

    typeof thisObj == 'undefined' && (thisObj = this);

    off = this.on(event, function (e) {
        callback.call(this, e);
        setImmediate(off);
    }, thisObj);

    return off;
};

/**
 * Alias for EventEmiter#once
 */
EventEmitter.prototype.one = EventEmitter.prototype.once;

/**
 * Manually remove one or more listeners/handlers.
 *
 * @param  {string|[string, fn]} [handle] If called with no arguments, all handlers will be removed. If called
 *                               with just an event name, all handlers for that event will be removed. If called with
 *                               an array containing a string and a specific handler, that handler will be removed for
 *                               the event named by the supplied string.
 */
EventEmitter.prototype.off = function (handle) {
    if (this[destroyed])
        return console.warn('Attempted to remove an event listener from a destroyed object'), this;

    // to remove all handlers for all events
    if (handle == null) {
        Object.defineProperty(this, eventHandlers, {value: Object.create(null)});
        return this;
    }

    typeof handle == 'string' && (handle = [handle]);
    var handlers = this[eventHandlers],
        event    = handle[0],
        fn       = handle[1];

    // removes all handlers for a given event
    if (event && fn == null && handlers[event]) {
        handlers[event].length = 0;
        return this;
    }

    for (var i = 0, l = handlers[event].length; i < l; i++) {
        if (handlers[event][i] == fn) {
            handlers[event][i] = null;
            break;
        }
    }

    if (this[destroying])
        return this;

    l > 10 && compact(handlers, event);

    return this;
};

/**
 * Emit an event, creating it first if necessary.
 * @param  {string|Event} event  The type of event being emitted
 * @param  {Object} message      Custom event message
 * @param  {Object} [config]     Set optional Event constructor properties
 */
EventEmitter.prototype.emitEvent = function (ev, message, config) {
    if (this[destroyed])
        return console.error('Attempted to emit event from destroyed object');

    var that = this,
        propagate = true,
        type, event;

    if (typeof ev == 'string') {
        type = ev;
        event = new Event(type, message, config ? config.canBubble : undefined, config ? config.cancelable : undefined);
        if (config) {
            config.onCancel && (event.onCancel = config.onCancel);
            config.async    && (event._async   = true);
        }
        event.target = this;
    } else if (ev instanceof Event) {
        event = ev;
        type  = event.type;
        event.atTarget && (event.atTarget = false);
    }
    ev = null;
    event.current = this;

    // Call handlers registered with this first, so that they have the opportunity to cancel propagation and/or prevent
    // the default handlers from being invoked.
    if (event._async)
        setImmediate(emit.bind(this, event, type, propagate));
    else
        emit.call(this, event, type, propagate);

    event = null;

    return this;
};

// may/should be implemented by subtypes
EventEmitter.prototype.propagateEvent = function (event) {return this};

/**
 * Destroys the event emitter.
 */
EventEmitter.prototype.destroy = function () {
    if (this[destroyed] || this[destroying])
        return console.info('destroy called on destroyed or destroying event emitter');

    Object.defineProperty(this, destroying, {value: true});

    var offs = this[offFuncs],
        last = function () {
                Object.defineProperty(this, destroying, {value: false, configurable: false});
                Object.defineProperty(this, destroyed, {value: true, configurable: false});
            }.bind(this),
        ondestroy;

    Object.defineProperty(this, offFuncs, {value: null, configurable: false});

    this[eventHandlers] && (this[eventHandlers].length = 0);
    Object.defineProperty(this, eventHandlers, {value: null, configurable: false});

    if (offs != null)
        for (var i = 0; i < offs.length; i++)
            doInTryCatch(offs[i]);

    if (typeof this.ondestroy == 'function')
        ondestroy = this.ondestroy();

    typeof ondestroy == 'object' && typeof ondestroy.then == 'function' && typeof ondestroy.catch == 'function' ?
        ondestroy.then(last).catch(last) : last();
};


/** @private */
function emit (event, type, propagate) {
    propagate && (propagate = fire(this[eventHandlers][type], event));

    // default events, if they aren't prevented, will be called even if the event is not allowed to propagate beyond
    // this object.
    if (!event.defaultPrevented) {
        ontype = 'on' + type;

        if (ontype && !this[ontype])
            ontype = 'on' + ucfirst(type);

        if (ontype && this[ontype]) { // should this happen in the `fire` helper?
            this[ontype](event);
            // default events may prevent further bubbling
            propagate = !event.canceled;
        }
    }

    // for debugging use
    if (this[eventHandlers]['*'])
        for (var i = 0; i < this[eventHandlers]['*'].length; i++)
            this[eventHandlers]['*'][i](type, event);

    // make it easy for subtypes to add bubbling
    if (propagate && event.bubbles) {
        if (event._async)
            setImmediate(this.propagateEvent.bind(this, event));
        else
            this.propagateEvent(event);
    }
}

/** @private */
function fire (handlers, eventObj) {
    if (!handlers || !handlers.length)
        return true; // so that we bubble

    for (var i = 0, l = handlers.length; i < l; i++)
        !eventObj.canceled && handlers[i] && handlers[i](eventObj);
    return !eventObj.canceled;
}

/** @private */
function ucfirst (str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/** @private */
function compact (obj, key) {
    obj[key] = obj[key].filter(function (x) {return !!x});
}

/** @private */
function doInTryCatch (fn) {try {fn()} catch (e) {console.warn(e)}}
