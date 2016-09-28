"use strict";

const commands = require("./commands");
const simpleClient = require("./client");

module.exports = (connection) => {
    if(!connection){
        throw "Must include host and port to connect."
    }

    let client = simpleClient(connection);

    let caller = {};

    for(let command in commands){

        caller[command] = (args, cb) => {

            let params;

            if (args instanceof Object && !(Array.isArray(args)) && !(args instanceof Function)) {

                params = parseParams(commands[command], args);

            } else if (args instanceof Function && !cb) {

                cb = args;

            } else if (Array.isArray(args) || args === null || args === undefined) {

                params = args;

            } else {

                throw `${args} is invalid input.`

            }

            client.call(command.toLowerCase(), params, (err, res) => {
                cb(err, res);
            })
        }
    }
    return caller;
}

let parseParams = (commandParams, args) => {
    let userParams = [];

    for(let arg of commandParams){

        if(typeof arg === "string") {

            userParams.push(args[arg]);

        } else if (typeof arg === "object") {

            let key = Object.keys(arg)[0];
            let defaultVal = arg[key];

            if(typeof args[key] !== "undefined") {

                userParams.push(args[key]);

            } else {

                userParams.push(defaultVal);

            }
        }
    }

    return userParams;
}