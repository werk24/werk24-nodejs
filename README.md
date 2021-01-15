# Werk24 Client


[![npm](https://img.shields.io/npm/v/werk24)](https://img.shields.io/npm/v/werk24)
![Tests | nodejs 10.x | 12.x | 14.x](https://github.com/werk24/werk24-nodejs/workflows/Tests%20%7C%20nodejs%2010.x%20%7C%2012.x%20%7C%2014.x/badge.svg)

- Understand the content of your PDF- and image-based Technical Drawings with a simple API call.

Werk24 offers an easy to use API to extract information from PDF- and image-based Technical Drawings.
With the API are able to obtain:

- Thumbnails of the Page / Canvas / Sectionals (Cuts and Perspectives)
- Measures incl. tolerances
- Geometric Dimensioning and Tolerancing Frames

Check our website at [https://www.werk24.io](https://www.werk24.io).
The project is persistently improved. Get in touch with us to obtain your API key.

## Installation

Npm installation

    npm i werk24
    

## Documentation

See [https://werk24.io/docs/index.html](https://werk24.io/docs/index.html)


## Example

    const werk24 = require("../src/index.js");

    // helper function to collect the responses
    let messages = [];
    function receive(curMessage) { messages.push(curMessage); }

    // load the library of available ask types and the drawing
    const askLib = await werk24.loadAsks();
    const drawingBytes = fs.readFileSync("./__int_tests__/assets/technical_drawing.png");

    // define the hooks that we are interested in
    const hooks = [new werk24.Hook(new askLib.W24AskVariantMeasures(), receive)];

    // make a new client instance from the environemnt variables
    // and perform the call
    let client = werk24.W24TechreadClient.makeFromEnv();
    try {
        await client.readDrawingWithHooks(drawingBytes, hooks);
    } catch (e) { console.error(e); } finally { client.close(); }
