/**
 * @module Grue/core/Eventing/Event
 * @author Noah Feldman <nfeldman@nsfdev.com>
 * @copyright 2012-2016
 */

module.exports = Event;

/**
 * A non-dom event object for messaging within applications.
 *
 * @param {string} type
 * @param {Object} body A hash of arbitrary event details
 * @param {boolean} [canBubble=true] Whether this event will bubble
 * @param {boolean} [cancelable=true]  Whether a handler can stop this event
 * @constructor
 */
function Event (type, body, canBubble, cancelable) {
    this.type   = type || '';
    this.detail = body === undefined ? {} : body; // allow explicit null
    this.target = null;
    this.atTarget  = true;
    this.current   = null;
    this.timeStamp = Date.now();
    this.canceled  = false;
    this.bubbles = canBubble !== false;
    this.defaultPrevented = false;
    this.cancelable = cancelable !== false;
    this.onCancel = null;

    return this; // explicit return is for when used with Function#apply
}

Event.prototype.cancel = function () {
    this.cancelable && (this.canceled = true);
    if (this.onCancel)
        return this.onCancel(this);
};

Event.prototype.preventDefault = function () {
    this.defaultPrevented = true;
};
