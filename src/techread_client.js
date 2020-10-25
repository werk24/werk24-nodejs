/* jshint esversion: 9 */
/* jslint node: true */
"use strict";
let pythonBridge = require("python-bridge");

let Hook = class {
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

let W24TechreadClient = class W24TechreadClient {
    constructor() {
        this.python = pythonBridge({
            python: "python3",
            // env: {PYTHONPATH: '/foo/bar'}
        });

        // import the required python packages
        this.python.ex`
            import asyncio
            from base64 import b64decode, b64encode
            import json
            import werk24
            import traceback


            loop = asyncio.get_event_loop()

            def receive_message(async_gen):

                # obtain the message from the asyncio geneator and print
                # the debug information on the python terminal if anything
                # goes wrong. This appears to be more stable than going
                # through the conversion with complex objects
                try:
                    message = loop.run_until_complete(asyncgen.__anext__())
                except StopAsyncIteration:
                    raise
                except BaseException as e:
                    traceback.print_exc(e)
                    raise StopAsyncIteration()

                try:
                    message.payload_bytes = b64encode(message.payload_bytes)
                except:
                    pass
                message_dict = json.loads(message.json())
                return message_dict`
            .then()
            .catch(this.python.Exception, (e) => { throw e; });
    }


    /**
     * Small helper function that creates a new
     * W24TechreadClient from the enviorment info.
     *
     * @param {string} license_path - path to the License file.
     *         By default we are looking for a .werk24 file in the current
     *         cwd. If argument is set to None, we are not loading any
     *         file and relying on the ENVIRONMENT variables only
     *
     * Raises:
     *     FileNotFoundError -- Raised when you pass a path to a license file
     *         that does not exist
     *     UnauthorizedException -- Raised when the credentials were not
     *         accepted by the API
     *
     * Returns:
     *     W24TechreadClient -- The techread Client
     */
    static makeFromEnv(license_path) {
        let that = new W24TechreadClient();
        that.python.ex`
            client = werk24.W24TechreadClient.make_from_env(license_path=${license_path})`
            .then()
            .catch(that.python.Exception, (e) => { throw e; });
        return that;
    }

    /** Make the username accessable to the CLI and GUI
     *
     * NOTE: this is mainly for the purpose of smoke testing
     * you integration tests. Beware that the correct authentication
     * does not guarantee a correct communication with the
     * API endpoint (the architecture is designed to be independent).
     * So for your integration smoke tests, you will also need to run a
     * simple request (e.g., AskPageThumbnail), which is typically
     * returned in less than 500ms.
     *
     *
     * Returns:
     *     str: username of the currently registered user
     */
    async username() {
        return await this.python`client.username`.catch(
            this.python.Exception,
            (e) => { throw e; }
        );
    }

    /**
     * Helper function to call the registered
     * hook function when data becomes available
     *
     * @param {Object} message
     * @param {Array<Hook>} hooks
     */
    async processMessage(message, hooks) {

        // pick the correct processor
        let processor = {
            ASK: this.processMessageAsk,
            ERROR: this.processMessageError,
            PROGRESS: this.processMessageProgress,
            REJECTION: this.processMessageRejection,
        }[message.message_type];

        // throw an error if that did not work
        if (processor == null) {
            throw new Error("Unknown W24TechreadMessageType. Please contact W24!");
        }
        // otherwise call the processor
        else {
            await processor(message, hooks);
        }
    }

    /**
     * Helper function that throws the correct
     * exception
     *
     * TODO: generalize the error processing.
     *     At this stage, the API is only
     *     return an INTERNAL_ERROR flag. If
     *     that changes, we need to update
     *     the method.
     *
     * @param {Object} message
     * @param {Array<Hook>} hooks
     */
    async processMessageError(message, hooks) {
        throw new Error(message);
    }

    /**
     * Helper function that throws the correct
     * exception
     *
     * TODO: implement custom rejection exceptions.
     *
     * @param {Object} message
     * @param {Array<Hook>} hooks
     */
    async processMessageRejection(message, hooks) {
        throw new Error(message);
    }

    /**
     * Helper function that finds the correct
     * progress hook and calls the function
     *
     * @param {Object} message
     * @param {Array<Hook>} hooks
     */
    async processMessageProgress(message, hooks) {
        for (let curHook of hooks) {
            // ignore if the hook does not defined the message
            // type progress
            if (
                curHook.message_type == undefined ||
                curHook.message_subtype != message.message_subtype
            ) {
                continue;
            }

            // otherwise we can really call the hook
            await curHook.func(message);
        }
    }

    /**
     * Helper function that finds the correct
     * progress hook and calls the function
     *
     * @param {Object} message
     * @param {Array<Hook>} hooks
     */
    async processMessageAsk(message, hooks) {
        for (let curHook of hooks) {
            // ignore if the hook does not defined the message
            // type progress
            if (curHook.ask.ask_type != message.message_subtype) {
                continue;
            }

            // otherwise we can really call the hook
            await curHook.func(message);
        }
    }

    /**
     * Helper function to end the W24TechreadClient
     * session.
     */
    async exitSession() {
        await this.python.ex`_ = loop.run_until_complete(client.__aexit__(None, None, None))`;
    }

    /**
     * Helper function that checks for new messages from
     * the client and processes them.
     *
     * The function returns True if more messages are
     * available. False otherwise
     *
     * @param {Array<Hook>}} hooks
     */
    async receiveMessage(hooks) {
        let moreMessages = true;
        const message = await this
            .python`receive_message(asyncgen)`
            .catch(this.python.Exception, () => { moreMessages = false; });

        // if we reached the end, stop processing
        if (moreMessages == false) { return false; }

        // decode the payload_bytes
        if (message.payload_bytes != null) {
            message.payload_bytes = Buffer.from(message.payload_bytes,'base64');
        }

        // we need to pass the information on to the
        // callHook method
        await this.processMessage(message, hooks);

        // tell the caller whether more data is available
        return true;
    }

    /**
     * Helper function to listen to the responses until
     * the next() raises a StopIteration exception.
     * This will set moreMessages to false and stop the loop.
     *
     * @param {Array<Hook>} hooks
     */
    async handleResponses(hooks) {
        // Keep calling the async next function until we see
        // a StopIteration exception. This is the sign for us
        // to stop asking for more
        while (await this.receiveMessage(hooks)) { }
    }

    /**
     * Perform the call to the backend.
     * NOTE: it appears to be quite involced to allow python
     * so asyncronously callback a javascrip function. We thus
     * use the read_drawing function with the adequate asks
     * and call the hooks from within javascript
     *
     * @param {Buffer} drawingBytes
     * @param {Array<Hook>} hooks
     * @param {Buffer} modelBytes
     */
    async sendRequest(drawingBytes, hooks, modelBytes) {
        // extract the list of the available asks
        let asks = hooks.map((x) => x.ask);

        // pushing the binary data into python directly throws
        // an exception. We thus opt for a base64 dncoding
        // TODO: PERFORMANCE: check a base85 or base265 encoding
        const drawingBytesBase64 = drawingBytes.toString("base64");

        // with the modelBytes information or not
        if (modelBytes == null) {
            await this.python
                .ex`asyncgen = session.read_drawing(b64decode(${drawingBytesBase64}), ${asks})`;
        } else {
            const modelBytesBase64 = modelBytes.toString("base64");
            await this.python
                .ex`asyncgen = session.read_drawing(b64decode(${drawingBytesBase64}), ${asks}, b64decode(${modelBytesBase64}))`;
        }
    }

    /**
     * Send the drawing to the API (can be PDF or image)
     * and register a number of callbacks that are triggered
     * once the asks become available.
     *
     * @param {Buffer} drawingBytes - Technical Drawing as Image or PDF
     * @param {Array<Hook>} hooks - List of Callback you want to obtain
     * @param {Buffer} modelBytes - CAD Model as DXF / DWG / STEP
     *
     */
    async readDrawingWithHooks(drawingBytes, hooks, modelBytes) {
        // enter a new session of the W24TechreadClient
        // this will start the authentication and get a new
        // token
        // TODO: entering the session can throw and exception.
        await this.python.ex`
            session = loop.run_until_complete(client.__aenter__())`.catch(
            this.python.Exception,
            (e) => { throw e; }
        );
        await this.sendRequest(drawingBytes, hooks, modelBytes);
        await this.handleResponses(hooks);
        await this.exitSession();
    }

    /**
     * Close the connection to the python bridge
     *
     * TODO: check whether there is really no destructor
     *     or context manager ins ES8. Makes me feel sad.
     *
     */
    close() {
        this.python.end();
    }
};

module.exports = { Hook: Hook, W24TechreadClient: W24TechreadClient };
