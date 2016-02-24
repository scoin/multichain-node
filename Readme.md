#A simple wrapper for Multichain's JSON RPC api.

All methods from the [multichain api spec](http://www.multichain.com/developers/json-rpc-api/) are usable.

See [commands.js](https://github.com/scoin/multichain-node/blob/development/lib/commands.js) for all methods and their required / optional arguments. 

The library includes a parser so you can pass an unordered object containing the parameters and omit any optional parameters you want, as seen in the examples below. 

You may also pass an ordered array of commands like you would for any JSON RPC client that will not be parsed.

All commands require a callback, but have been tested to work with [Bluebird promisification](http://bluebirdjs.com/docs/api/promisification.html).

To use in your project:

```
npm install multichain-node --save
```

Examples:
       
```javascript 
let multichain = require("multichain-node")({
    port: 6282,
    host: '127.0.0.1',
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

multichain.getAddresses((err, addresses) => {

    multichain.createMultiSig({nrequired: 2, keys: addresses}, (err, wallet) => {
        console.log(wallet)
    })
    
})

multichain.getRawTransaction({txid: someTxId}, (err, tx) => {

    multichain.decodeRawTransaction({"hexstring": tx}, (err, dTx) => {
        console.log(dTx)
    })
})


```