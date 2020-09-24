#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debugMod = require('debug');
const debug = debugMod('openapi-cop:proxy');
debug.log = console.log.bind(console); // output to stdout
const chalk = require("chalk");
const chokidar = require("chokidar");
const program = require("commander");
const path = require("path");
const app_1 = require("./app");
// Rename for consistent display of package name in help output
process.argv[1] = path.join(process.argv[1], 'openapi-cop');
program //
    .option('-s, --file <file>', 'path to the OpenAPI definition file')
    .option('-h, --host <host>', 'the host of the proxy server', '0.0.0.0')
    .option('-p, --port <port>', 'port number on which to run the proxy', 8888)
    .option('-t, --target <target>', 'full base path of the target API (format: http(s)://host:port/basePath)')
    .option('--default-forbid-additional-properties', 'disallow additional properties when not explicitly specified')
    .option('--silent', 'do not send responses with validation errors, just set validation headers')
    .option('-w, --watch [watchLocation]', 'watch for changes in a file or directory (falls back to the OpenAPI file) and restart server accordingly')
    .option('-v, --verbose', 'show verbose output')
    .version('1.0.0')
    .parse(process.argv);
let server;
if (program.verbose) {
    debugMod.enable('openapi-cop:proxy');
}
// Validate CLI arguments
if (!program.file) {
    console.log('Did not provide a OpenAPI file path.\n');
    program.outputHelp();
    process.exit();
}
if (!program.target) {
    console.log('Did not provide a target server URL.\n');
    program.outputHelp();
    process.exit();
}
const targetMatch = program.target.match(/\w+:\/\/([A-Za-z0-9\-._~:\/?#[\]@!$&'()*+,;=]+):(\d{4})(\/|$)/);
const targetHost = targetMatch !== null ? targetMatch[1] : '';
const targetPort = targetMatch !== null ? targetMatch[2] : '';

if (!targetPort || isNaN(Number(targetPort))) {
    console.log('Did not provide a port number within the target URL.\n');
    program.outputHelp();
    process.exit();
}

if (program.target.indexOf('//localhost') !== -1 &&
    program.port === Number(targetPort)) {
    console.log('Cannot proxy locally to the same port!');
    process.exit();
}
/**
 * Starts or restarts the express server.
 * @param restart - Used to log different messages when the server is restarted.
 */
async function start(restart = false) {
    try {
        server = await app_1.runProxy({
            port: program.port,
            host: program.host,
            targetUrl: program.target,
			targetHost: targetHost,
            apiDocFile: program.file,
            defaultForbidAdditionalProperties: program.defaultForbidAdditionalProperties,
            silent: program.silent,
        });
    }
    catch (e) {
        process.exit();
    }
    if (!restart) {
        const nodeEnv = process.env.NODE_ENV || 'development';
        console.log(chalk.blue('Proxy at   ' +
            chalk.bold(`http://${program.host}:${program.port}`) +
            ` (${nodeEnv} mode)`));
        console.log(chalk.blue('Target at  ' + chalk.bold(program.target)));
    }
    else {
        console.log(chalk.hex('#eeeeee')('Restarted proxy server'));
    }
}
// Start immediately
start();
// Watch for file changes and restart server
if (program.watch) {
    const watchLocation = typeof program.watch !== 'boolean' ? program.watch : program.file;
    const watcher = chokidar.watch(watchLocation, { persistent: true });
    console.log(chalk.blue(`Watching changes in '${watchLocation}'`));
    watcher.on('change', path => {
        console.log(chalk.hex('#eeeeee')(`Detected change in file ${path}. Restarting server...`));
        server.close(() => {
            start(true);
        });
    });
}
// Close process gracefully
process.on('SIGTERM', () => {
    debug('Received SIGTERM signal to terminate process.');
    server.close(() => {
        process.exit();
    });
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});
//# sourceMappingURL=cli.js.map