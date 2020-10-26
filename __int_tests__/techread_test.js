/* jshint esversion: 9 */
/* jslint node: true */
"use strict";
const werk24 = require("../src/index.js");
const fs = require('fs');
const { expect } = require('chai');

/**
 * Integration test suite for the Techreader
 */
describe("Integration Test: Techreader", function () {

    /**
     * Test whether we can obtain the Variant Measures
     *
     * NOTE: this function is cited on the README page
     */
    it('tests page thumbnail', async function () {


        // helper function to collect the responses
        let messages = [];
        function receive(curMessage) { messages.push(curMessage); }

        // load the library of available ask types
        const askLib = await werk24.loadAsks();

        // load the test file
        const drawingBytes = fs.readFileSync("./__int_tests__/assets/technical_drawing.png");

        // define the hooks that we are interested in
        const ask = new askLib.W24AskPageThumbnail();
        const hooks = [new werk24.Hook(ask, receive)];

        // make a new client instance from the environemnt variables
        let client = werk24.W24TechreadClient.makeFromEnv();
        try {
            // ask the client to perform the action
            await client.readDrawingWithHooks(drawingBytes, hooks);
        } catch (e) {
            // if anything goes wrong, we will throw a heir
            // of W24TechreadException.
            // NOTE: the client will only establish a connection
            // to the server when you call radDrawingWithHooks.
            // So authentication exceptions will also be thrown here.
            console.error(e);

        } finally {
            // close the connection
            client.close();
        }

        // If everything worked correctly, we should now have one
        // message of VariantMesures
        expect(messages.length).to.equal(1);
    });

    /**
     * Test whether we can send (train) VariantCAD messages to
     * werk24
     */
    it('tests variant cad', async function () {


        // helper function to collect the responses
        let messages = [];
        function receive(curMessage) { messages.push(curMessage); }

        // load the library of available ask types
        const askLib = await werk24.loadAsks();

        // load the test file
        const drawingBytes = fs.readFileSync("./__int_tests__/assets/technical_drawing.png");

        // define the hooks that we are interested in
        const ask = new askLib.W24AskVariantCAD({ is_training: true });
        const hooks = [new werk24.Hook(ask, receive)];

        // make a new client instance from the environemnt variables
        let client = werk24.W24TechreadClient.makeFromEnv();
        try { await client.readDrawingWithHooks(drawingBytes, hooks);
        } catch (e) { console.error(e); } finally { client.close(); }

        // If everything worked correctly, we should now have one
        // message of VariantMesures
        expect(messages.length).to.equal(0);
    });


});