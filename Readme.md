A native Javascript client built for Multichain and Bitcoin
---------------------------------------------------

Note: The current version is compatible with Multichain 1.0.2. For previous versions of Multichain that may be incompatible, see [Releases](https://github.com/scoin/multichain-node/releases).

All methods from the [Multichain API spec](http://www.multichain.com/developers/json-rpc-api/) are available. This library does not currently contain all bitcoind commands that are not part of the Multichain API spec, and as such is not really suitable for use with bitcoind. If you would like to add these commands, please submit a pull request with tests.

See [commands.js](https://github.com/scoin/multichain-node/blob/development/lib/commands.js) for all methods and their required / optional parameters. 

### Parser

The library includes a parser so you can pass an unordered object containing the parameters and omit any optional parameters you want, as seen in the examples below. 

You may also pass an ordered array of commands like you would for any JSON RPC client that will not be parsed.

### Promisification

All commands require a callback, but have been tested to work with [Bluebird promisification](http://bluebirdjs.com/docs/api/promisification.html).

### SSL

SSL is supported. Pass your connection parameters as you would to the [core HTTPS library](https://nodejs.org/api/https.html#https_https_globalagent).

### Usage

To use in your project:

```
npm install multichain-node --save
```

To run the tests:

Make sure you have multichain installed, so that `multichaind` and `multichain-util` are on your path.

```
git clone <the repo>
npm install
npm test
```

### Examples:

Many more examples in `test.js`, but here's some basics:
       
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

multichain.issue({address: someAddress, asset: "zcoin", qty: 50000, units: 0.01, details: {hello: "world"}}, (err, res) => {
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
### Tests

All commands are tested. To run the tests, pull the repo and make sure multichaind and multichain-util are on your path.

From inside the directory, run `npm test`.
