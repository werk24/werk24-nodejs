/* jshint esversion: 8 */
/* jslint node: true */
"use strict";

const Hook = class Hook {
    /**
     * Internal helper class that allows the user to
     * define what information is requested and what
     * shall be done when that information becomes
     * available.
     */
    constructor(ask, func) {
        this.ask = ask;
        this.func = func;
    }
};
