/* jshint esversion: 8 */
/* jslint node: true */
"use strict";

const libTechreadClient = require('./src/techread_client.js');
const libAsk = require('./src/models/ask.js');

module.exports = {
    Hook: libTechreadClient.Hook,
    W24TechreadClient: libTechreadClient.W24TechreadClient,
    loadAsks: libAsk.loadAsks
};