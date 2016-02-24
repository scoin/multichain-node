"use strict";

const rpc = require('json-rpc2');
const commands = require("./commands");

module.exports = (connection) => {
    if(!connection){
        throw "Must include IP and Port to connect."
    }

    let client = rpc.Client.$create(connection.port, connection.address, connection.user, connection.pass);
    let caller = {};

    for(let command in commands){

        caller[command] = (args, cb) => {

            let params = [];

            if (typeof args === "function" && !cb){
                cb = args;
                args = null;
            }

            if(args){
                for(let arg of commands[command]){
                    if(typeof arg === "string"){
                        params.push(args[arg]);
                    } else if (typeof arg === "object"){
                        let key = Object.keys(arg)[0];
                        let defaultVal = arg[key];

                        if(typeof args[key] !== "undefined"){
                            params.push(args[key]);
                        } else {
                            params.push(defaultVal);
                        }
                    }
                }
            }

            client.call(command.toLowerCase(), params, (err, res) => {

                if(err){
                    return cb(JSON.parse(err.message.substr(5, err.message.length)))
                }

                cb(null, res);
            })
        }
    }
    return caller;
}