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

            } else if (Array.isArray(args) || args === null || args === undefined) {

                params = args;

            } else if (args instanceof Function && !cb) {

                cb = args;

            } else if(args != undefined) {

                throw `${args} is invalid input.`

            }

            let promiseReturn = null;

            if(!cb){
                promiseReturn = new Promise((resolve, reject) => {
                    cb = (err, res) => {
                        if(err){
                            return reject(err);
                        }
                        resolve(res);
                    }
                })
            }


            client.call(command.toLowerCase(), params, cb);

            return promiseReturn;

        }
    }
    return caller;
}

let parseParams = (commandParams, userParams) => {
    let assignedParams = [];
    let evaluated = {};

    for(let arg of commandParams){

        if(typeof arg === "string") {

            assignedParams.push(userParams[arg]);

            evaluated[arg] = userParams[arg];

        } else if (typeof arg === "object") {

            let key = Object.keys(arg)[0];
            let defaultVal = arg[key];

            if(userParams.hasOwnProperty(key)) {

                assignedParams.push(userParams[key]);
                evaluated[key] = userParams[key];

            } else {

                assignedParams.push(defaultVal);

                typeof defaultVal !== "function" ? evaluated[key] = defaultVal : null;

            }
        }
    }

    for(let i in assignedParams){
        if(typeof assignedParams[i] !== "function"){
            continue
        }
        let fn = assignedParams[i];

        assignedParams[i] = undefined;

        assignedParams[i] = fn(evaluated);
    }

    return assignedParams;
}