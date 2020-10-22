/* jshint esversion: 8 */
/* jslint node: true */
"use strict";


let pythonBridge = require('python-bridge');


function makeNodeAskClass(askAttrs) {
    /**
     * Make a complely new Class that has the same
     * name, attributes and default values as the
     * python equivalent
     */
    const askClass = class {
        // store the defaults in the new class,
        // so that the constructor can access them
        // _defaults = askAttrs;

        // build a dynamic constructor that prefers the
        // direct setting of variables, but falls back
        // to the defaults if must be
        constructor(kwargs = {}) {

            const kwargKeys = Object.keys(kwargs);
            for (let curKey in this._defaults) {

                // DEAR REVIEWER: there must be a nicer
                // way of writing this. The destination
                // stays the same!
                if (kwargKeys.indexOf(curKey) != -1) {
                    this[curKey] = kwargs[curKey];
                } else {
                    this[curKey] = this._defaults[curKey];
                }
            }
        }
    };

    // Set the defaults through a prototype.
    // NOTE: You might be tempted to use public fields
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields
    // Yet, they are currently in stage 3 and are not uniformly supported.
    askClass.prototype._defaults = askAttrs;

    return askClass;
}

function makeNodeAsk(askList) {
    /**
     * Make the local asks from the list that is generated
     * by load_asks
     */
    return new Promise(resolve => {
        let asks = {};

        for (let askDetails of askList) {

            // shorten handles
            const askName = Object.keys(askDetails)[0];
            const askAttrs = Object.values(askDetails)[0];

            // make a new class and store it
            asks[askName] = makeNodeAskClass(askAttrs);
        }
        resolve(asks);
    });
}


function loadAsks() {
    // Load all the asks from the python library and turn them into node
    // objects.
    return new Promise((resolve) => {

        let python = pythonBridge();

        // import the W24TechreadClient
        python.ex`from werk24.techread_client import W24TechreadClient as Client`.then();

        // make the asks available as node objects
        python.ex`from werk24.models.ask import *`.then();

        // get the names and attributes of the asks from the python object
        // NOTE: typing.get_args is only available from python 3.8
        // NOTE: we need to go the long way through json to make sure that
        //    we are only dealing with flat objects. dict() will still yield objects
        python.ex`from typing import get_args`.then();
        python.ex`import json`.then();
        python`[{a.__name__:json.loads(a().json())} for a in get_args(W24AskUnion)]`
            .then(makeNodeAsk)
            .then(asks => resolve(asks));

        python.end();
    });
}

module.exports = {loadAsks:loadAsks};