## SMW Central - Online Tools
Online tools maintained and hosted by [SMW Central](https://www.smwcentral.net/). This repository holds the source code and is meant for developers. All submitted work is subject to SMW Central's [Submission & Upload Rules](https://www.smwcentral.net/?p=cms&page=1417699-site-wide-general-behavior-rules-and-guidelines#section-c), including rule C1.

Users should visit the [Online Tools section](https://www.smwcentral.net/?p=onlinetools).

## Layout
Tools are stored in the `src` directory. The reference API code is located at `src/api.js`. Each tool consists of the following files.

### `tool.json`
Contains information about the tool and its dependencies. It must follow the schema documented in [`scripts/tool.schema.json`](https://github.com/SMWCentral/OnlineTools/blob/main/scripts/tool.schema.json). A sample `tool.json` is available in [`src/tool.sample.json`](https://github.com/SMWCentral/OnlineTools/blob/main/src/tool.sample.json).

### `index.js`
Automatically loaded as a module. Its default export must be a function that initializes the tool. The function receives one argument, `smwc`, which contains the [API](#API).

### `index.html`
Optional. If present, it will be automatically included. Can be referenced through the API.

## Setup
Tools can be developed in a local environment or in a code playground.

### Local
Local development requires Node.js v14+. After cloning the repository, install its dependencies with NPM.

```shell
$ npm install
```

After installation, you can execute `npm run build` or `npm run build-dev` to create a `dist` folder that you can load in a web server.

```shell
$ npm run build     # build for production
$ npm run build-dev # build without minifying source code
```

### Playground
You can develop tools in CodePen and JSFiddle. Start from a template:
- [CodePen](https://codepen.io/telinc1/pen/LYyGyye)
- [JSFiddle](https://jsfiddle.net/Telinc1/2hcuv7L8/)

Both templates define a function called `tool` which correponds to the default export of a tool's `index.js` file.

In order to run an existing tool in a playground:
- Copy its `index.html` to the HTML section.
- Copy its `index.js` to the JS section. Then, replace the default export (`export default function(smwc){ ... }`) with the `tool` function (`function tool(smwc){ ... }`).
- If you rename the `tool` function, update the reference to it in the call to `runInPlayground(tool)`.
- Some tools may have dependencies specified in their `tool.json`. They have to be manually added to the playground.

The same steps can be done in reverse to transfer a tool from the playground to this repository.

## Guidelines for new tools
- Make sure your tool is convenient for online use. Tools with a lot of inputs or outputs, tools that need to perform heavy computation, and tools that need to store persistent state are generally not usable online.
- If you're not submitting your own tool, you should have permission from its author to upload it, or the license agreement included with the tool (if it has one) should specify that it may be reuploaded to other sites.
- The tool is directly related or useful for a game supported by SMW Central.
- Tools must work in the same browsers supported by SMW Central: [the latest versions of Mozilla Firefox, Google Chrome, and iOS Safari](https://www.smwcentral.net/?p=viewthread&t=95897#browser-support).
- Pull requests shouldn't change the API implementation unless strictly necessary.

## API
The main function of a tool receives an instance of this API as a single argument. The reference implementation can be found in `src/api.js`.

Note that SMW Central may implement the API differently. Therefore, you should not rely on any implementation details of `src/api.js`.

```typescript
interface API {
    /**
     * The root container for the tool's HTML.
     *
     * Not necessarily an `Element`. Can be any `Node`, including a `ShadowRoot`.
     *
     * Typically, you should use `byID` to query elements.
     */
    root: Node;

    /**
     * Retrieve an element by its `id` attribute.
     *
     * This is the recommended way to communicate between the HTML and the JS of a tool.
     */
    byID: (id: string) => Element;

    /**
     * Displays a status message with an appropriate style.
     *
     * By default, a container for the status messages will be created in an implementation-defined place.
     * Most tools should use this behavior.
     *
     * Alternatively, if an element with the ID "status" exists, it will be used as the container.
     *
     * `error` statuses take precedence over `success` statuses, which take precedence over `message` statuses.
     * Use `success` and `error` where appropriate, and `message` only for generic messages.
     *
     * If no message exists in the given object, the current status message will be hidden.
     *
     * If the tool produces a downloadable file, don't show a status. Only download the file.
     */
    setStatus: (status: {
        error?: string;
        success?: string;
        message?: string;
    }) => void;

    /**
     * Downloads a file named `name` with the contents of the given `blob`.
     *
     * The returned Promise resolves after the download has been initiated.
     * There is no guarantee that the user will choose to save the file.
     */
    download: (name: string, blob: Blob) => Promise<void>;
}
```

## License
Released under the [MIT License](https://github.com/SMWCentral/OnlineTools/blob/main/LICENSE.md).

## Credits
Built and maintained by [Telinc1](https://github.com/telinc1). SMW Central is property of [Noivern](https://smwc.me/u/6651).
