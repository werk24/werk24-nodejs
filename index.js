/* jshint esversion: 9 */
/* jslint node: true */
"use strict";


async function convertPdfToCad(
    drawingBytes,
    modelBytes,
    isTrainingRequest
) {
    // load the library of available ask types
    const askLib = await require('./src/models/ask.js')();

    // define the hooks that we are interested in
    const askCreateCad = new askLib.W24AskVariantMeasures({ is_training_request: isTrainingRequest });
    const hooks = [new Hook(askCreateCad, console.log)];

    // make a new client instance from the environemnt variables
    let client = W24TechreadClient.makeFromEnv();

    try {
        // ask the client to perform the action
        await client.readDrawingWithHooks(drawingBytes, hooks, modelBytes);

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
}
convertPdfToCad("");

