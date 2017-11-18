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
    console.log("WAITING FOR CONFIRMATIONS")
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

    console.log("TEST: GET INFO")
    multichain.getInfo((err, res) => {
        assert(res, "Could not get info");
    })

    console.log("TEST: GET MINING INFO")
    multichain.getMiningInfo((err, res) => {
        assert(res, "Could not get mining info");
    })

    console.log("TEST: GET BLOCKCHAIN PARAMS")
    multichain.getBlockchainParams((err, res) => {
        assert(res);
    })

    console.log("TEST: GET PEER INFO")
    multichain.getPeerInfo((err, res) => {
        assert(res, "Could not get peer info");
    })

    console.log("TEST: GET BLOCK HASH")
    multichain.getBlockHash({height: 1}, (err, blockHash) => {
        assert(blockHash, "Could not get block hash at height 1");
        
        console.log("TEST: GET BLOCK")
        multichain.getBlock({hash: blockHash}, (err, block) => {
            assert(block, "Could not get block from hash")
        })
    })

    console.log("TEST: GET NEW ADDRESS")
    multichain.getNewAddressPromise()
    .then(address => {
        assert(address, "Could not get new address")
        this.address1 = address;

        console.log("TEST: VALIDATE ADDRESS")
        return multichain.validateAddressPromise({address: this.address1})
    })
    .then(addrInfo => {
        assert(addrInfo);
        assert(addrInfo.isvalid === true);
        assert(addrInfo.address === this.address1);

        console.log("TEST: DUMP PRIVATE KEY")
        return multichain.dumpPrivKeyPromise({address: this.address1})
    })
    .then(privateKey => {
        assert(privateKey)

        console.log("TEST: GRANT")
        return multichain.grantPromise({
            addresses: this.address1,
            permissions: "send,receive,issue,admin"
        })
    })
    .then(permissionsTxid => {
        assert(permissionsTxid)
        
        console.log("TEST: GET NEW ADDRESS")
        return multichain.getNewAddressPromise();
    })
    .then(address2 => {
        assert(address2, "Could not get new address 2");
        this.address2 = address2;

        console.log("TEST: GRANT FROM")
        return multichain.grantFromPromise({
            from: this.address1,
            to: this.address2,
            permissions: "issue"
        })
    })
    .then(permissionsTxid => {
        assert(permissionsTxid)
        
        console.log("TEST: GRANT WITH METADATA")
        return multichain.grantWithMetadataPromise({addresses: this.address2, permissions: "send", data: new Buffer("some important data").toString("hex")})
    })
    .then(permissionsTxid => {
        assert(permissionsTxid)
        
        console.log("TEST: GRANT WITH METADATA FROM")
        return multichain.grantWithMetadataFromPromise({from: this.address1, to: this.address2, permissions: "receive", data: new Buffer("another important data").toString("hex")})
    })
    .then(permissionsTxid => {
        assert(permissionsTxid)
        
        console.log("TEST: GET WALLET TRANSACTION")
        return multichain.getWalletTransactionPromise({txid: permissionsTxid})
    })
    .then(txData => {
        let msg = new Buffer(txData.data[0], "hex").toString("utf8");
        assert.equal(msg, "another important data")
        
        console.log("TEST: LIST PERMISSIONS")
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
        
        console.log("TEST: REVOKE")
        return multichain.revokePromise({addresses: this.address2, permissions: "issue"})
    })
    .then(revokeTxid => {
        assert(revokeTxid);
        
        console.log("TEST: ISSUE")
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
        
        console.log("TEST: LIST ASSETS")
        return multichain.listAssetsPromise()
    })
    .then(assets => {
        assert(assets)
        
        console.log("TEST: ISSUE FROM")
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
        
        console.log("TEST: GET ADDRESS BALANCES")
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
        
        console.log("TEST: GET TOTAL BALANCES")
        return multichain.getTotalBalancesPromise({minconf: 1})
    })
    .then(totalBalances => {
        assert(totalBalances)
        assert(totalBalances.length === 2)
        
        console.log("TEST: SEND ASSET FROM")
        return multichain.sendAssetFromPromise({
            from: this.address1,
            to: this.address2,
            asset: "foocoin",
            qty: 50
        })
    })
    .then(txid => {
        assert(txid);
        
        console.log("TEST: SEND FROM ADDRESS")
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

        console.log("TEST: GET WALLET TRANSACTION")
        return multichain.getWalletTransactionPromise({
            txid: txid
        })
    })
    .then(tx => {
        assert(tx);

        console.log("TEST: SEND WITH METADATA FROM")
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
        console.log("TEST: GET RAW TRANSACTION")
        return multichain.getRawTransactionPromise({
            txid: this.txid
        })
    })
    .then(txHex => {
        assert(txHex);
        console.log("TEST: DECODE RAW TRANSACTION")
        return multichain.decodeRawTransactionPromise({
            hexstring: txHex
        })
    })
    .then(tx => {
        assert(tx);
        assert(tx.data[0] = new Buffer("a nice message, for you").toString("hex"));
        
        console.log("TEST: LIST ADDRESS TRANSACTIONS")
        return multichain.listAddressTransactionsPromise({
            address: this.address2
        })
    })
    .then(transactions => {
        assert(transactions)

        console.log("TEST: PREPARE LOCK UNSPENT FROM")
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

        console.log("TEST: CREATE RAW TRANSACTION")
        return multichain.createRawTransactionPromise(rawTxData)
    })
    .then(rawTx => {
        assert(rawTx);

        console.log("TEST: APPEND RAW METADATA")
        return multichain.appendRawMetadataPromise({
            tx: rawTx,
            data: new Buffer("some more metadata").toString("hex")
        })
    })
    .then(rawTx => {
        assert(rawTx);

        console.log("TEST: SIGN RAW TRANSACTION")
        return multichain.signRawTransactionPromise({
            hexstring: rawTx
        })
    })
    .then(signedTx => {
        assert(signedTx);
        assert(signedTx.hex);

        console.log("TEST: SEND RAW TRANSACTION")
        return multichain.sendRawTransactionPromise({
            hexstring: signedTx.hex
        })
    })
    .then(txid => {
        assert(txid);

        console.log("TEST: GET RAW TRANSACTION")
        return multichain.getRawTransactionPromise({
            txid: txid,
            verbose: 1
        })
    })
    .then(tx => {
        assert(tx);

        console.log("TEST: GET TX OUT")
        return multichain.getTxOutPromise({
            txid: tx.txid,
            vout: tx.vout[0].n,
            unconfirmed: true
        })
    })
    .then(txOut => {
        assert(txOut);
        assert(txOut.assets.length === 1);

        console.log("TEST: LIST LOCK UNSPENT")
        return multichain.listLockUnspentPromise()
    })
    .then(unspent => {
        assert(unspent);

        console.log("TEST: LOCK UNSPENT")
        return multichain.lockUnspentPromise({
            unlock: true,
            outputs: unspent
        })
    })
    .then(unlocked => {
        assert(unlocked);

        console.log("TEST: GET ADDRESS BALANCES")
        return multichain.getAddressBalancesPromise({
            minconf: 0,
            address: this.address1
        })
    })
    .then(balances => {
        assert(balances);
        console.log("TEST: PREPARE LOCK UNSPENT")
        return multichain.prepareLockUnspentPromise({
            assets: {
                barcoin: 500
            }
        })
    })
    .then(outputs => {
        assert(outputs);
        this.outputForExchange = outputs;

        console.log("TEST: PREPARE LOCK UNSPENT")
        return multichain.prepareLockUnspentPromise({
            assets: {
                foocoin: 200
            }
        })
    })
    .then(outputs => {
        assert(outputs)

        console.log("TEST: CREATE RAW EXCHANGE")
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

        console.log("TEST: APPEND RAW EXCHANGE")
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

        console.log("TEST: DECODE RAW EXCHANGE")
        return multichain.decodeRawExchangePromise({
            hexstring: rawExchange.hex
        })
    })
    .then(decodedExchange => {
        assert(decodedExchange);

        console.log("TEST: SEND RAW TRANSACTION")
        return multichain.sendRawTransactionPromise({
            hexstring: this.rawExchange.hex
        })
    })
    .then(txid => {
        assert(txid);

        console.log("TEST: GET WALLET TRANSACTION")
        return multichain.getWalletTransactionPromise({
            txid: txid,
            verbose: true
        })
    })
    .then(tx => {
        assert(tx);

        console.log("TEST: ISSUE MORE")
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
        console.log("TEST: GET MULTI BALANCES")
        return multichain.getMultiBalancesPromise({
            addresses: [this.address1, this.address2],
            assets: ["foocoin", "barcoin"]
        })
    })
    .then(balances => {
        assert(balances)

        console.log("TEST: CREATE MULTI SIG")
        return multichain.createMultiSigPromise({
            nrequired: 2,
            keys: [this.address1, this.address2]
        })
    })
    .then(multiSigWallet => {
        assert(multiSigWallet);
        assert(multiSigWallet.address);

        console.log("TEST: CREATE STREAM")
        return multichain.createPromise({
            type: "stream",
            name: "stream1",
            open: true
        })
    })
    .then(stream => {
        assert(stream)

        console.log("TEST: CREATE STREAM FROM")
        return multichain.createPromise({
            type: "stream",
            name: "stream2",
            open: true,
            from: this.address2,
            details: {
                "something": "yes"
            }
        })
    })
    .then(stream2 => {
        assert(stream2)

        console.log("TEST: LIST STREAMS")
        return multichain.listStreamsPromise()
    })
    .then(streamList => {
        assert.equal(streamList.length, 3)

        console.log("TEST: SUBSCRIBE STREAM")
        return multichain.subscribePromise({
            stream: "stream1"
        })
    })
    .then(subscribed => {
        console.log("TEST: PUBLISH STREAM")
        return multichain.publishPromise({
            stream: "stream1",
            key: "test1",
            data: new Buffer("some stream data").toString("hex")
        })
    })
    .then(hexstring => {
        assert(hexstring)

        console.log("TEST: PUBLISH FROM")
        return multichain.publishFromPromise({
            from: this.address2,
            stream: "stream1",
            key: "test2",
            data: new Buffer("some more stream data").toString("hex")
        })
    })
    .then(hexstring => {
        assert(hexstring);

        console.log("TEST: LIST STREAM KEYS");
        return multichain.listStreamKeysPromise({
            stream: "stream1"
        })
    })
    .then(streamKeys => {
        assert.equal(streamKeys.length, 2);

        console.log("TEST: LIST STREAM KEY ITEMS");
        return multichain.listStreamKeyItemsPromise({
            stream: "stream1",
            key: "test1",
            verbose: true
        })
    })
    .then(streamKeyItems => {
        assert.equal(streamKeyItems.length, 1);
        assert.equal(streamKeyItems[0].key, "test1");
        this.streamData = streamKeyItems[0].data;

        console.log("TEST: GET TXOUTDATA")
        return multichain.getTxOutDataPromise({
            txid: streamKeyItems[0].txid,
            vout: 0
        })

    })
    .then(txData => {
        assert(txData)
        assert.equal(txData, this.streamData)

        console.log("TEST: LIST STREAM ITEMS")
        return multichain.listStreamItemsPromise({
            stream: "stream1",
            verbose: true
        })
    })
    .then(streamItems => {
        assert(streamItems)
        assert.equal(streamItems.length, 2)

        console.log("TEST: LIST STREAM PUBLISHER ITEMS")
        return multichain.listStreamPublisherItemsPromise({
            stream: "stream1",
            address: this.address2,
            verbose: true
        })
    })
    .then(getStreamItem => {
        console.log("TEST: GET STREAM ITEM");
        return multichain.getStreamItemPromise({
            stream: "stream1",
            txid: getStreamItem[0].txid
        })
    })
    .then(streamPublisherItems => {
        assert(streamPublisherItems)

        console.log("TEST: LIST STREAM PUBLISHERS")
        return multichain.listStreamPublishersPromise({
            stream: "stream1"
        })
    })
    .then(streamPublishers => {
        assert(streamPublishers)

        console.log("TEST: UNSUBSCRIBE")
        return multichain.unsubscribePromise({
            stream: "stream1"
        })
    })
    .then(unsubbed => {

        console.log("TEST: PAUSE")
        return multichain.pausePromise({
            tasks: "mining,incoming"
        })
    })
    .then(() => {

        console.log("TEST: SET LAST BLOCK")
        return multichain.setLastBlockPromise({
            hash: "1"
        })
    })
    .then(hash => {
        assert(hash);

        console.log("TEST: CLEAR MEMPOOL")
        return multichain.clearMempoolPromise()
    })
    .then(() => {
        console.log("TEST: RESUME")
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
