/**
 * @module Grue/core/EventEmitter
 * @author Noah Feldman <nfeldman@nsfdev.com>
 * @copyright 2012-2015
 */

var randStr = require('./randStr'),
    each    = require('./each'),
    hasOwn  = Function.prototype.call.bind({}.hasOwnProperty);

module.exports = EventEmitter;
EventEmitter.Event = Event;

// for side effects
require('setimmediate');

/**
 * @constructs EventEmitter
 * 
 * Provides an easy way to setup communication between objects.
 * Requires IE9+ or a modern browser
 */
function EventEmitter () {
    Object.defineProperty(this, '__destroyed', {value: false, writable: true});
    Object.defineProperty(this, '__destroying', {value: false, writable: true});
    Object.defineProperty(this, '__event_handlers', {value: Object.create(null)});
    Object.defineProperty(this, '__off_funcs', {value: null, writable: true});
    // put this on the object because we can't safely keep it in the
    // surrounding scope without wide support for WeakMap
    Object.defineProperty(this, '__eeid', {value: randStr('eeid_')});
}

/**
 * Call a callback when an event fires. 
 * 
 * @param  {string}   event    Name of the event to listen on.
 * @param  {Function} callback function to call when the event fires
 * @param  {Object}   [thisObj=this]  call the callback with thisObj as its `this`
 *                                    pass null to set `this` to undefined
 * @return {Function} off call to remove the event listener
 */
EventEmitter.prototype.on = function (event, callback, thisObj) {
    if (~event.indexOf(' '))
        return event.split(' ').map(function (e) {return this.on(e, callback, thisObj)}, this);

    if (this.__destroyed)
        throw Error('Attempted to add an event listener to a destroyed object');

    var events = this.__event_handlers[event] || (this.__event_handlers[event] = []),
        that   = this,
        fn, off;

    if (!callback)
        throw Error('No event handler supplied');

    if (thisObj === undefined)
        fn = callback.bind(this);
    else if (thisObj === null)
        fn = function () {
            "use strict";
            return callback.apply(undefined, arguments);
        };
    else
        fn = callback.bind(thisObj);

    off = function () {
        that.off([event, fn]);

        if (that.__destroying || that.__destroyed)
            return;

        for (var i = 0; i < that.__off_funcs.length; i++) {
            if (that.__off_funcs == off) {
                that.__off_funcs.splice(i, 1);
                break;
            }
        }
    };

    !this.__off_funcs && (this.__off_funcs = []);
    this.__off_funcs.push(off);

    events.push(fn);
    
    off.event = event;
    return off;
};


/**
 * Like EventEmitter#on, but only executed once
 * 
 * @param {string}   event     the type of event to listen for, e.g. 'change'
 * @param {Function} callback  function to call when the event fires
 * @param {Object}   [thisObj=this] context in which to call the callback
 * @return {Function} off call to remove the event listener
 */
EventEmitter.prototype.once = function (event, callback, thisObj) {
    if (this.__destroyed)
        throw Error('Attempted to add an event listener to a destroyed object');

    var that = this, off;

    typeof thisObj == 'undefined' && (thisObj = this);

    off = this.on(event, function (e) {
        callback.call(this, e);
        setImmediate(function () {off()});
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
 * @param  {string|[string, fn]} [handle] If called with no arguments, 
 *                               all handlers will be removed. If called 
 *                               with just an event name, all handlers for 
 *                               that event will be removed. If called with 
 *                               an array containing a string and a specific 
 *                               handler, that handler will be removed for 
 *                               that event named by the supplied string.
 * @return {[type]}        [description]
 */
EventEmitter.prototype.off = function (handle) {
    if (this.__destroyed) {
        console.info('Attempted to remove an event listener from a destroyed object');
        return this;
    }

    var handlers = this.__event_handlers,
        event, fn;

    // to remove all handlers for all events
    if (handle == null) {
        this.__event_handlers = Object.create(null);
        return this;
    }

    typeof handle == 'string' && (handle = [handle]);
    event = handle[0];
    fn    = handle[1];

    // blows away all handlers for a given event
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

    if (this.__destroying)
        return this;

    l > 10 && compact(handlers, event);

    return this;
};


/**
 * Emit an event, creating it first if necessary.
 * @param  {string|Event} event  The type of event being emitted
 * @param  {Object} message      Custom event message
 * @param  {Object} [config]     Set optional Event constructor properties
 * @return {this}
 */
EventEmitter.prototype.emitEvent = function (ev, message, config) {
    if (this.__destroyed)
        throw Error('Attempted to emit event from destroyed object');

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

    // call handlers registered with this first, so that they have the
    // opportunity to cancel propagation and/or prevent the default handlers
    // from being invoked
    if (event._async)
        setImmediate(emit.bind(this, event, type, propagate));
    else
        emit.call(this, event, type, propagate);

    event = null;

    return this;
};

// may/should be implemented by subtypes
EventEmitter.prototype.eePropagateEvent = function (event) {return this};

/**
 * Tear down the event emitter
 * @return {undefined} [description]
 */
EventEmitter.prototype.destroy = function () {
    if (this.__destroyed)
        return console.info('destroy called on destroyed event emitter');

    this.__destroying = true;

    if (this.__off_funcs != null)
        for (var i = 0, l = this.__off_funcs.length; i < l; i++)
            this.__off_funcs[i]();

    this.__off_funcs      = null;
    this.__event_handlers = null;
    this.__destroyed      = true;
};


/**
 * @constructor
 * A non-dom event object for messaging within applications.
 * Based on GrueEvent
 * @param {string} type
 * @param {Object} body       A hash of arbitrary event details
 * @param {boolean} [canBubble=true] Whether this event will bubble
 * @param {boolean} [cancelable=true]  Whether a handler can stop this event
 * @return {Event}
 */
function Event (type, body, canBubble, cancelable) {
    this.type = type || '';
    this.detail = body === undefined ? {} : body; // allow explicit null
    this.target = null;
    this.atTarget = true;
    this.current  = null;
    this.timeStamp = +new Date;
    this.canceled = false;
    this.bubbles = canBubble !== false;
    this.defaultPrevented = false;
    this.cancelable = cancelable !== false;
    this.onCancel   = null;
    return this; // so it returns this when used with Function#apply
}

Event.prototype.cancel = function () {
    this.cancelable && (this.canceled = true);
    if (this.onCancel)
        this.onCancel(this);
};

Event.prototype.preventDefault = function () {
    this.defaultPrevented = true;
};

/** @private */
function emit (event, type, propagate) {
    propagate && (propagate = fire(this.__event_handlers[type], event));

    // default events, if they aren't prevented, will be called even if the
    // event is not allowed to propagate beyond this object.
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
    if (this.__event_handlers['*'])
        for (var i = 0; i < this.__event_handlers['*'].length; i++)
            this.__event_handlers['*'][i](type, event);

    // make it easy for subtypes to add bubbling
    if (propagate && event.bubbles) {
        if (event._async)
            setImmediate(this.eePropagateEvent.bind(this, event));
        else
            this.eePropagateEvent(event);
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

/** @private (and probably not actually a good idea) */
function compact (obj, key) {
    obj[key] = obj[key].filter(function (x) {return !!x});
}


// -----------------------------------------------------------------------------

// WIP aspect oriented-esque utilities to add events around arbitrary methods
// TODO test that this stuff actually works

// connections becomes a map of object ids to a map of before and after callbacks
// while attachements is used to store the original methods that we're wrapping
var connections = null,
    attachments = null;

/**
 * Replaces a function property with a wrapper function that will
 * notify zero or more subscribers, invoke the original function, then
 * notify zero or more additional subscribers.
 *
 * @private
 * 
 * @param  {Object} object Any JS object. In theory, you can use this
 *                         with host objects in modern desktop browsers,
 *                         but you probably shouldn't.
 * @param  {string} name   Name of a function property of the object.
 * @return {undefined}
 */
function attach (object, name) {"use strict";
    !attachments && (attachments = Object.create(null));
    !connections && (connections = Object.create(null));

    var id = object.___g_ee_id = randStr('eeid_'),
        fn = object[name];

    connections[id] = Object.create(null);
    attachments[id] = Object.create(null);
    attachments[id][name] = fn;

    object[name] = function () {"use strict";
        var args = [],
            after, ret;

        for (var i = 0; i < arguments.length; i++)
            args[i] = arguments[i];

        fireAdvice('before', id, name, args.slice(0));
        ret = fn.apply(object, args);

        if (connections[id][name].after && connections[id][name].after.length) {
            after = [ret];
            after.push.apply(after, args);
            fireAdvice('after', id, name, after);
        }

        return ret;
    };
}

/**
 * A shortcut to unhook all listeners from a given function or
 * to restore all wrapped functions in a given object
 * 
 * @param  {Object} object
 * @param  {string} name   The name of a function property of object
 * @return {undefined}
 */
EventEmitter.detach = function (object, name) {
    var id = object.___g_ee_id;

    if (name) {
        object[name] = attachments[id][name];
        delete attachments[id][name];
        delete connections[id][name];
        return;
    }

    each(attachments[id], function (fn, name) {
        object[name] = fn;
        delete attachments[id];
        delete connections[id];
    });

    delete object.___g_ee_id;
};

/** @private */
function connect (position, object, name, callback, thisObj) {
    var id, list;

    if (!hasOwn(object, '___g_ee_id'))
        attach(object, name);

    id = object.___g_ee_id;

    !connections[id][name] && (connections[id][name] = Object.create(null));
    list = connections[id][name][position] || (connections[id][name][position] = []);
    
    if (thisObj === undefined)
        thisObj = object;

    list.push([callback, thisObj]);

    return function () {
        disconnect(position, id, name, fn);
    };
}

/** @private */
function disconnect (position, id, name, fn) {
    var list = connections[id] && connections[id][name] && connections[id][name][position];

    if (!(list && list.length))
        return;

    for (var i = 0; i < list.length; i++)
        if (list[i] == fn)
            break;

    if (i < list.length)
        list.splice(i, 1);
}

/**
 * Call an arbitrary function with the arguments intended for the
 * function property of some object, before calling that function property.
 * 
 * @param  {Object}   object   Any JS object
 * @param  {string}   name     Property name of a function property of `object`
 * @param  {Function} callback Function to call before calling the original function
 * @param  {Object}   [thisObj=object]  Object to use as `this` of callback
 * @return {undefined}
 */
EventEmitter.before = function (object, name, callback, thisObj) {
    return connect('before', object, name, callback, thisObj);
};

/**
 * Call an arbitrary function with the arguments intended for the
 * function property of some object, after calling that function property.
 * 
 * @param  {Object}   object   Any JS object
 * @param  {string}   name     Property name of a function property of `object`
 * @param  {Function} callback Function to call after calling the original function
 * @param  {Object}   [thisObj=object]  Object to use as `this` of callback
 * @return {undefined}
 */
EventEmitter.after = function (object, name, callback, thisObj) {
    return connect('after', object, name, callback, thisObj);
};

/**
 * Call an arbitrary function with the arguments intended for the
 * function property of some object, before and after calling that function property.
 * 
 * @param  {Object}   object   Any JS object
 * @param  {string}   name     Property name of a function property of `object`
 * @param  {Function} callback Function to call around the original function
 * @param  {Object}   [thisObj=object]  Object to use as `this` of callback
 * @return {undefined}
 */
EventEmitter.around = function (object, name, callback, thisObj) {
    var off1 = connect('before', object, name, callback, thisObj),
        off2 = connect('after', object, name, callback, thisObj);

    return function () {
        try {off1()} catch (e) {console.warn(e)}
        try {off2()} catch (e) {console.warn(e)}
    };
};

function fireAdvice (position, id, name, args) {"use strict";
    var list = connections[id] && connections[id][name] && connections[id][name][position];
    if (!list || !list.length)
        return console.warn('no advice');

    for (var i = 0; i < list.length; i++) {
        try {
            list[i][0].apply(list[i][1], args);
        } catch (e) {
            console.error(e);
        }
    }
};
