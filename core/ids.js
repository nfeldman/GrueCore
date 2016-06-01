/**
 * Functions to create ids for various use cases that aren't nearly as long as
 * UUID but are still very, very unlikely to collide.
 *
 * @module Grue/core/ids
 * @author Noah Feldman <nfeldman@nsfdev.com>
 * @copyright 2016
 */

var randStr = require('./randStr'),
    START = new Date((new Date).getUTCFullYear() + '/1/1');


exports.id = function () {
    return randStr(8);
};

// Using milliseconds since the start of the current year as a prefix accomplishes two things:
//      creates buckets that the six character ids would have to collide in -- the collision has to occur within the
//      same millisecond
//
//      ensures sequentially created ids look sequential, which can be useful, e.g. database keys
//
// The uri safe version generates 12 character strings. The non uri safe version base64 encodes those strings.

exports.uriSafeSequentialRandomId = function () {
    return randStr(6, (Date.now() - START).toString(36)).slice(2);
};

exports.sequentialRandomId = function () {
    return atob(randStr(6, (Date.now() - START)).toString(36));
};

exports.uuid = function () {
    //// return uuid of form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    var uuid = '', i;
    for (i = 0; i < 32; i += 1) {
        switch (i) {
        case 8:
        case 20:
            uuid += '-';
            uuid += (Math.random() * 16 | 0).toString(16);
            break;
        case 12:
            uuid += '-';
            uuid += '4';
            break;
        case 16:
            uuid += '-';
            uuid += (Math.random() * 4 | 8).toString(16);
            break;
        default:
            uuid += (Math.random() * 16 | 0).toString(16);
        }
    }
    return uuid;
};
