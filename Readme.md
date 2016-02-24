##A simple wrapper for Multichain's JSON RPC api.

All methods from the [multichain api spec](http://www.multichain.com/developers/json-rpc-api/) are usable.

The library includes a parser so you can pass an object containing the parameter names, as seen in the addresses below. You may also pass an array of commands like you would for any JSON RPC client that will not be parsed.

See commands.js for all commands and their required / optional arguments.

All commands require a callback, but have been tested to work with Bluebird promisification.

To use in your project:

```
npm install multichain-node --save
```

Examples:
       
```javascript 
let multichain = require("multichain-node")({
    port: 6282,
    address: '127.0.0.1',
    user: "multichainrpc",
    pass: "somepass"
});

multichain.getInfo((err, info) => {
    if(err){
        throw err;
    }
    console.log(info);
})

multichain.issue({address: someAddress, name: "zcoin", qty: 50000, units: 0.01, details: {hello: "world"}}, (err, res) => {
    console.log(res)
})

multichain.sendAssetFrom({from: someAddress, to: someOtherAddress, asset: "zcoin", qty: 5}, (err, tx) => {
    console.log(tx);
})

multichain.getRawTransaction({txid: someTxId}, (err, tx) => {

    multichain.decodeRawTransaction({"hexstring": tx}, (err, dTx) => {

        console.log(dTx)

    })
})


```