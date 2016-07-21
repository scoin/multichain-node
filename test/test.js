"use strict";

const assert = require('assert');

const connection = {
    port: 6601,
    host: '127.0.0.1',
    user: "test",
    pass: "test"
}

const bluebird = require("bluebird");
const multichain = bluebird.promisifyAll(require("../index.js")(connection), {suffix: "Promise"});

let listenForConfirmations = (txid, cb) => {
    var interval = setInterval(() => {
        getConfirmations(txid, (err, confirmations) => {
            if(confirmations > 0){
                clearInterval(interval);
                return cb(null, true);
            }
            return cb(null, false);
        }) 
    }, 5000)
}

let getConfirmations = (txid, cb) => {
    multichain.getWalletTransaction({
        txid: txid
    }, (err, tx) => {
        if(err){
            console.log("look for confirmed state", err)
            return cb(err)
        }
        return cb(null, tx.confirmations);
    })
}

let startTests = () => {
    console.log("Running Tests")
    multichain.getInfo((err, res) => {
        assert(res, "Could not get info");
    })

    multichain.getMiningInfo((err, res) => {
        assert(res, "Could not get mining info");
    })

    multichain.getBlockchainParams((err, res) => {
        assert(res);
    })

    multichain.getPeerInfo((err, res) => {
        assert(res, "Could not get peer info");
    })

    multichain.getBlockHash({height: 1}, (err, blockHash) => {
        assert(blockHash, "Could not get block hash at height 1");
        multichain.getBlock({hash: blockHash}, (err, block) => {
            assert(block, "Could not get block from hash")
        })
    })

    multichain.getNewAddressPromise()
    .then(address => {
        assert(address, "Could not get new address")
        this.address1 = address;
        return multichain.validateAddressPromise({address: this.address1})
    })
    .then(addrInfo => {
        assert(addrInfo);
        assert(addrInfo.isvalid === true);
        assert(addrInfo.address === this.address1);
        return multichain.dumpPrivKeyPromise({address: this.address1})
    })
    .then(privateKey => {
        assert(privateKey)
        return multichain.grantPromise({
            addresses: this.address1,
            permissions: "send,receive,issue,admin"
        })
    })
    .then(permissionsTxid => {
        assert(permissionsTxid)
        return multichain.getNewAddressPromise();
    })
    .then(address2 => {
        assert(address2, "Could not get new address 2");
        this.address2 = address2;
        return multichain.grantFromPromise({
            from: this.address1,
            to: this.address2,
            permissions: "issue"
        })
    })
    .then(permissionsTxid => {
        assert(permissionsTxid)
        return multichain.grantWithMetadataPromise({addresses: this.address2, permissions: "send", data: new Buffer("some important data").toString("hex")})
    })
    .then(permissionsTxid => {
        assert(permissionsTxid)
        return multichain.grantWithMetadataFromPromise({from: this.address1, to: this.address2, permissions: "receive", data: new Buffer("another important data").toString("hex")})
    })
    .then(permissionsTxid => {
        assert(permissionsTxid)
        return multichain.getWalletTransactionPromise({txid: permissionsTxid})
    })
    .then(txData => {
        let msg = new Buffer(txData.data[0], "hex").toString("utf8");
        assert.equal(msg, "another important data")
        return multichain.listPermissionsPromise({
            addresses: `${this.address1},${this.address2}`,
            verbose: true
        })
    })
    .then(permissions => {
        assert(permissions);
        let permissionSet = permissions.reduce((acc, permission, i) => {
            if(!acc[permission.address]){
                acc[permission.address] = {types: {}, admin: ""};
            }
            acc[permission.address].types[permission.type] = true;
            acc[permission.address].admin = permission.admins[0];
            return acc;
        }, {})

        assert("send" in permissionSet[this.address1].types)
        assert("receive" in permissionSet[this.address1].types)
        assert("issue" in permissionSet[this.address1].types)
        assert("admin" in permissionSet[this.address1].types)

        assert("send" in permissionSet[this.address2].types)
        assert("receive" in permissionSet[this.address2].types)
        assert("issue" in permissionSet[this.address2].types)
        assert(permissionSet[this.address2].admin === this.address1)
        return multichain.revokePromise({addresses: this.address2, permissions: "issue"})
    })
    .then(revokeTxid => {
        assert(revokeTxid);
        return multichain.issuePromise({
            address: this.address1, 
            asset: {
                name: "foocoin",
                open: true
            },
            qty: 1000, 
            units: 0.1
        })
    })
    .then(issueTxid => {
        assert(issueTxid);
        listenForConfirmations(issueTxid, (err, confirmed) => {
            if(err){
                throw err;
            }
            if(confirmed === true){
                confirmCallback1.call(this);
            }
        })
    })
    .catch(err => {
        console.log(err)
        throw err;
    })
}

let confirmCallback1 = () => {
    bluebird.bind(this)
    .then(() => {
        return multichain.listAssetsPromise()
    })
    .then(assets => {
        assert(assets)
        return multichain.issueFromPromise({
            from: this.address1,
            to: this.address2,
            asset: "barcoin",
            qty: 10000,
            details: {
                "foo": "bar"
            }
        })
    })
    .then(issueTxid => {
        assert(issueTxid);
        this.issueTxid = issueTxid;
        return multichain.getAddressBalancesPromise({
            address: this.address2,
            minconf: 0
        })
    })
    .then(balances => {
        assert(balances);
        listenForConfirmations(this.issueTxid, (err, confirmed) => {
            if(err){
                throw err;
            }
            if(confirmed == true){
                confirmCallback2.call(this);
            }
        })
    })
    .catch(err => {
        console.log(err)
        throw(err)
    })
}

let confirmCallback2 = () => {
    bluebird.bind(this)
    .then(() => {
        return multichain.getTotalBalancesPromise({minconf: 1})
    })
    .then(totalBalances => {
        assert(totalBalances)
        assert(totalBalances.length === 2)
        return multichain.sendAssetFromPromise({
            from: this.address1,
            to: this.address2,
            asset: "foocoin",
            qty: 50
        })
    })
    .then(txid => {
        assert(txid);
        return multichain.sendFromAddressPromise({
            from: this.address2,
            to: this.address1,
            amount: {
                "barcoin": 50
            }
        })
    })
    .then(txid => {
        assert(txid);
        return multichain.getWalletTransactionPromise({
            txid: txid
        })
    })
    .then(tx => {
        assert(tx);
        return multichain.sendWithMetadataFromPromise({
            from: this.address1,
            to: this.address2,
            amount: {
                foocoin: 150
            },
            data: new Buffer("a nice message, for you").toString("hex")
        })
    })
    .then(txid => {
        assert(txid);
        this.txid = txid;
        listenForConfirmations(txid, (err, confirmed) => {
            if(err){
                throw err;
            }
            if(confirmed == true){
                confirmCallback3.call(this);
            }
        })
    })
    .catch(err => {
        console.log(err)
        throw err;
    })
}

let confirmCallback3 = () => {
    bluebird.bind(this)
    .then(() => {
        return multichain.getRawTransactionPromise({
            txid: this.txid
        })
    })
    .then(txHex => {
        assert(txHex);
        return multichain.decodeRawTransactionPromise({
            hexstring: txHex
        })
    })
    .then(tx => {
        assert(tx);
        assert(tx.data[0] = new Buffer("a nice message, for you").toString("hex"));
        return multichain.listAddressTransactionsPromise({
            address: this.address2
        })
    })
    .then(transactions => {
        assert(transactions)
        return bluebird.join(multichain.prepareLockUnspentFromPromise({
            from: this.address1,
            assets: {
                foocoin: 100
            }
        }),
        multichain.prepareLockUnspentFromPromise({
            from: this.address2,
            assets: {
                barcoin: 100
            }
        }))
    })
    .then(lockedOutputs => {
        assert(lockedOutputs);
        assert(lockedOutputs.length === 2);
        let rawTxData = {
            inputs: lockedOutputs,
            amounts: {}
        }
        rawTxData.amounts[this.address1] = {
            barcoin: 100
        }
        rawTxData.amounts[this.address2] = {
            foocoin: 100
        }
        return multichain.createRawTransactionPromise(rawTxData)
    })
    .then(rawTx => {
        assert(rawTx);
        return multichain.appendRawMetadataPromise({
            tx: rawTx,
            data: new Buffer("some more metadata").toString("hex")
        })
    })
    .then(rawTx => {
        assert(rawTx);
        return multichain.signRawTransactionPromise({
            hexstring: rawTx
        })
    })
    .then(signedTx => {
        assert(signedTx);
        assert(signedTx.hex);
        return multichain.sendRawTransactionPromise({
            hexstring: signedTx.hex
        })
    })
    .then(txid => {
        assert(txid);
        return multichain.getRawTransactionPromise({
            txid: txid,
            verbose: 1
        })
    })
    .then(tx => {
        assert(tx);
        return multichain.getTxOutPromise({
            txid: tx.txid,
            vout: tx.vout[0].n,
            unconfirmed: true
        })
    })
    .then(txOut => {
        assert(txOut);
        assert(txOut.assets.length === 1);
        return multichain.listLockUnspentPromise()
    })
    .then(unspent => {
        assert(unspent);
        return multichain.lockUnspentPromise({
            unlock: true,
            outputs: unspent
        })
    })
    .then(unlocked => {
        assert(unlocked);
        return multichain.getAddressBalancesPromise({
            minconf: 0,
            address: this.address1
        })
    })
    .then(balances => {
        assert(balances);
        return multichain.prepareLockUnspentPromise({
            assets: {
                barcoin: 500
            }
        })
    })
    .then(outputs => {
        assert(outputs);
        this.outputForExchange = outputs;
        return multichain.prepareLockUnspentPromise({
            assets: {
                foocoin: 200
            }
        })
    })
    .then(outputs => {
        return multichain.createRawExchangePromise({
            txid: outputs.txid,
            vout: outputs.vout,
            assets: {
                barcoin: 500
            }
        })
    })
    .then(rawPartialTx => {
        assert(rawPartialTx);
        return multichain.appendRawExchangePromise({
            hexstring: rawPartialTx,
            txid: this.outputForExchange.txid,
            vout: this.outputForExchange.vout,
            assets: {
                foocoin: 200
            }
        })
    })
    .then(rawExchange => {
        assert(rawExchange);
        this.rawExchange = rawExchange;
        return multichain.decodeRawExchangePromise({
            hexstring: rawExchange.hex
        })
    })
    .then(decodedExchange => {
        assert(decodedExchange);
        return multichain.sendRawTransactionPromise({
            hexstring: this.rawExchange.hex
        })
    })
    .then(txid => {
        assert(txid);
        return multichain.getWalletTransactionPromise({
            txid: txid,
            verbose: true
        })
    })
    .then(tx => {
        assert(tx);
        return multichain.issueMorePromise({
            address: this.address2,
            asset: "foocoin",
            qty: 10000
        })
    })
    .then(txid => {
        listenForConfirmations(txid, (err, confirmed) => {
            if(err){
                throw err;
            }
            if(confirmed == true){
                confirmCallback4.call(this);
            }
        })
    })
    .catch(err => {
        console.log(err)
        throw err;
    })
}

let confirmCallback4 = () => {
    bluebird.bind(this)
    .then(() => {
        return multichain.getMultiBalancesPromise({
            addresses: [this.address1, this.address2],
            assets: ["foocoin", "barcoin"]
        })
    })
    .then(balances => {
        assert(balances)
        return multichain.createMultiSigPromise({
            nrequired: 2,
            keys: [this.address1, this.address2]
        })
    })
    .then(multiSigWallet => {
        assert(multiSigWallet);
        assert(multiSigWallet.address);
    })
    .then(() => {
        return multichain.pausePromise({
            tasks: "mining,incoming"
        })
    })
    .then(() => {
        return multichain.setLastBlockPromise({
            hash: "1"
        })
    })
    .then(hash => {
        assert(hash);
        return multichain.clearMemPoolPromise()
    })
    .then(() => {
        return multichain.resumePromise({
            tasks: "mining,incoming"
        })
    })
    .then(() => {
        console.log("Finished Successfully")
    })
    .catch(err => {
        console.log(err)
        throw err;
    })
}

startTests()