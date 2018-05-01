"use strict";

const assert = require('assert');

const connection = {
    port: 6601,
    host: '127.0.0.1',
    user: "test",
    pass: "test"
}

const multichain = require("../index.js")(connection);

let listenForConfirmations = (txid) => {
    console.log("WAITING FOR CONFIRMATIONS")

    return new Promise((resolve, reject) => {
        var interval = setInterval(() => {
            
            getConfirmations(txid)
            .then(confirmations => {
                if(confirmations > 0){
                    clearInterval(interval);
                    return resolve()
                }
            })
            .catch(err => {
                return reject(err);
            })

        }, 5000)
    })
}

let getConfirmations = (txid) => {
    return multichain.getWalletTransaction({
        txid: txid
    })
    .then(res => {
        return res.confirmations;
    })
}

let startTests = () => {
    const state = {};
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
    multichain.getNewAddress()
    .then(address => {
        assert(address, "Could not get new address")
        state.address1 = address;

        console.log("TEST: VALIDATE ADDRESS")
        // return multichain.validateAddress({address: state.address1})
        return multichain.validateAddress({address: state.address1})
    })
    .then(addrInfo => {
        assert(addrInfo);
        assert(addrInfo.isvalid === true);
        assert(addrInfo.address === state.address1);

        console.log("TEST: DUMP PRIVATE KEY")
        // return multichain.dumpPrivKey({address: state.address1})
        return multichain.dumpPrivKey({address: state.address1})
    })
    .then(privateKey => {
        assert(privateKey)

        console.log("TEST: GRANT")
        return multichain.grant({
            addresses: state.address1,
            permissions: "send,receive,issue,admin"
        })
    })
    .then(permissionsTxid => {
        assert(permissionsTxid)
        
        console.log("TEST: GET NEW ADDRESS")
        return multichain.getNewAddress();
    })
    .then(address2 => {
        assert(address2, "Could not get new address 2");
        state.address2 = address2;

        console.log("TEST: GRANT FROM")
        return multichain.grantFrom({
            from: state.address1,
            to: state.address2,
            permissions: "issue"
        })
    })
    .then(permissionsTxid => {
        assert(permissionsTxid)
        
        console.log("TEST: GRANT WITH METADATA")
        return multichain.grantWithMetadata({addresses: state.address2, permissions: "send", data: new Buffer("some important data").toString("hex")})
    })
    .then(permissionsTxid => {
        assert(permissionsTxid)
        
        console.log("TEST: GRANT WITH METADATA FROM")
        return multichain.grantWithMetadataFrom({from: state.address1, to: state.address2, permissions: "receive", data: new Buffer("another important data").toString("hex")})
    })
    .then(permissionsTxid => {
        assert(permissionsTxid)
        
        console.log("TEST: GET WALLET TRANSACTION")
        return multichain.getWalletTransaction({txid: permissionsTxid})
    })
    .then(txData => {
        let msg = new Buffer(txData.data[0], "hex").toString("utf8");
        assert.equal(msg, "another important data")
        
        console.log("TEST: LIST PERMISSIONS")
        return multichain.listPermissions({
            addresses: `${state.address1},${state.address2}`,
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

        assert("send" in permissionSet[state.address1].types)
        assert("receive" in permissionSet[state.address1].types)
        assert("issue" in permissionSet[state.address1].types)
        assert("admin" in permissionSet[state.address1].types)

        assert("send" in permissionSet[state.address2].types)
        assert("receive" in permissionSet[state.address2].types)
        assert("issue" in permissionSet[state.address2].types)
        assert(permissionSet[state.address2].admin === state.address1)
        
        console.log("TEST: REVOKE")
        return multichain.revoke({addresses: state.address2, permissions: "issue"})
    })
    .then(revokeTxid => {
        assert(revokeTxid);
        
        console.log("TEST: ISSUE")
        return multichain.issue({
            address: state.address1, 
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
        return listenForConfirmations(issueTxid)
    })
    .then(_ => {
        console.log("TEST: LIST ASSETS")
        return multichain.listAssets({
            count: 50
        })
    })
    .then(assets => {
        assert(assets)
        
        console.log("TEST: ISSUE FROM")
        return multichain.issueFrom({
            from: state.address1,
            to: state.address2,
            asset: "barcoin",
            qty: 10000,
            details: {
                "foo": "bar"
            }
        })
    })
    .then(issueTxid => {
        assert(issueTxid);
        state.issueTxid = issueTxid;
        
        console.log("TEST: GET ADDRESS BALANCES")
        return multichain.getAddressBalances({
            address: state.address2,
            minconf: 0
        })
    })
    .then(balances => {
        assert(balances);
        return listenForConfirmations(state.issueTxid)
    })
    .then(_ => {
        console.log("TEST: GET TOTAL BALANCES")
        return multichain.getTotalBalances({minconf: 1})
    })
    .then(totalBalances => {
        assert(totalBalances)
        assert(totalBalances.length === 2)
        
        console.log("TEST: SEND ASSET FROM")
        return multichain.sendAssetFrom({
            from: state.address1,
            to: state.address2,
            asset: "foocoin",
            qty: 50
        })
    })
    .then(txid => {
        assert(txid);
        
        console.log("TEST: SEND FROM ADDRESS")
        return multichain.sendFromAddress({
            from: state.address2,
            to: state.address1,
            amount: {
                "barcoin": 50
            }
        })
    })
    .then(txid => {
        assert(txid);

        console.log("TEST: GET WALLET TRANSACTION")
        return multichain.getWalletTransaction({
            txid: txid
        })
    })
    .then(tx => {
        assert(tx);

        console.log("TEST: SEND WITH METADATA FROM")
        return multichain.sendWithMetadataFrom({
            from: state.address1,
            to: state.address2,
            amount: {
                foocoin: 150
            },
            data: new Buffer("a nice message, for you").toString("hex")
        })
    })
    .then(txid => {
        assert(txid);
        state.txid = txid;
        return listenForConfirmations(txid)
    })
    .then(_ => {
        console.log("TEST: GET RAW TRANSACTION")
        return multichain.getRawTransaction({
            txid: state.txid
        })
    })
    .then(txHex => {
        assert(txHex);
        console.log("TEST: DECODE RAW TRANSACTION")
        return multichain.decodeRawTransaction({
            hexstring: txHex
        })
    })
    .then(tx => {
        assert(tx);
        assert(tx.data[0] = new Buffer("a nice message, for you").toString("hex"));
        
        console.log("TEST: LIST ADDRESS TRANSACTIONS")
        return multichain.listAddressTransactions({
            address: state.address2
        })
    })
    .then(transactions => {
        assert(transactions)

        console.log("TEST: PREPARE LOCK UNSPENT FROM")
        return Promise.all([multichain.prepareLockUnspentFrom({
            from: state.address1,
            assets: {
                foocoin: 100
            }
        }),
        multichain.prepareLockUnspentFrom({
            from: state.address2,
            assets: {
                barcoin: 100
            }
        })])
    })
    .then(lockedOutputs => {
        assert(lockedOutputs);
        assert(lockedOutputs.length === 2);
        let rawTxData = {
            inputs: lockedOutputs,
            amounts: {}
        }
        rawTxData.amounts[state.address1] = {
            barcoin: 100
        }
        rawTxData.amounts[state.address2] = {
            foocoin: 100
        }

        console.log("TEST: CREATE RAW TRANSACTION")
        return multichain.createRawTransaction(rawTxData)
    })
    .then(rawTx => {
        assert(rawTx);

        console.log("TEST: APPEND RAW METADATA")
        return multichain.appendRawMetadata({
            tx: rawTx,
            data: new Buffer("some more metadata").toString("hex")
        })
    })
    .then(rawTx => {
        assert(rawTx);

        console.log("TEST: SIGN RAW TRANSACTION")
        return multichain.signRawTransaction({
            hexstring: rawTx
        })
    })
    .then(signedTx => {
        assert(signedTx);
        assert(signedTx.hex);

        console.log("TEST: SEND RAW TRANSACTION")
        return multichain.sendRawTransaction({
            hexstring: signedTx.hex
        })
    })
    .then(txid => {
        assert(txid);

        console.log("TEST: GET RAW TRANSACTION")
        return multichain.getRawTransaction({
            txid: txid,
            verbose: 1
        })
    })
    .then(tx => {
        assert(tx);

        console.log("TEST: GET TX OUT")
        return multichain.getTxOut({
            txid: tx.txid,
            vout: tx.vout[0].n,
            unconfirmed: true
        })
    })
    .then(txOut => {
        assert(txOut);
        assert(txOut.assets.length === 1);

        console.log("TEST: LIST LOCK UNSPENT")
        return multichain.listLockUnspent()
    })
    .then(unspent => {
        assert(unspent);

        console.log("TEST: LOCK UNSPENT")
        return multichain.lockUnspent({
            unlock: true,
            outputs: unspent
        })
    })
    .then(unlocked => {
        assert(unlocked);

        console.log("TEST: GET ADDRESS BALANCES")
        return multichain.getAddressBalances({
            minconf: 0,
            address: state.address1
        })
    })
    .then(balances => {
        assert(balances);
        console.log("TEST: PREPARE LOCK UNSPENT")
        return multichain.prepareLockUnspent({
            assets: {
                barcoin: 500
            }
        })
    })
    .then(outputs => {
        assert(outputs);
        state.outputForExchange = outputs;

        console.log("TEST: PREPARE LOCK UNSPENT")
        return multichain.prepareLockUnspent({
            assets: {
                foocoin: 200
            }
        })
    })
    .then(outputs => {
        assert(outputs)

        console.log("TEST: CREATE RAW EXCHANGE")
        return multichain.createRawExchange({
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
        return multichain.appendRawExchange({
            hexstring: rawPartialTx,
            txid: state.outputForExchange.txid,
            vout: state.outputForExchange.vout,
            assets: {
                foocoin: 200
            }
        })
    })
    .then(rawExchange => {
        assert(rawExchange);
        state.rawExchange = rawExchange;

        console.log("TEST: DECODE RAW EXCHANGE")
        return multichain.decodeRawExchange({
            hexstring: rawExchange.hex
        })
    })
    .then(decodedExchange => {
        assert(decodedExchange);

        console.log("TEST: SEND RAW TRANSACTION")
        return multichain.sendRawTransaction({
            hexstring: state.rawExchange.hex
        })
    })
    .then(txid => {
        assert(txid);

        console.log("TEST: GET WALLET TRANSACTION")
        return multichain.getWalletTransaction({
            txid: txid,
            verbose: true
        })
    })
    .then(tx => {
        assert(tx);

        console.log("TEST: ISSUE MORE")
        return multichain.issueMore({
            address: state.address2,
            asset: "foocoin",
            qty: 10000
        })
    })
    .then(txid => {
        return listenForConfirmations(txid);
    })
    .then(_ => {
        console.log("TEST: GET MULTI BALANCES")
        return multichain.getMultiBalances({
            addresses: [state.address1, state.address2],
            assets: ["foocoin", "barcoin"]
        })
    })
    .then(balances => {
        assert(balances)

        console.log("TEST: CREATE MULTI SIG")
        return multichain.createMultiSig({
            nrequired: 2,
            keys: [state.address1, state.address2]
        })
    })
    .then(multiSigWallet => {
        assert(multiSigWallet);
        assert(multiSigWallet.address);

        console.log("TEST: CREATE STREAM")
        return multichain.create({
            type: "stream",
            name: "stream1",
            open: true
        })
    })
    .then(stream => {
        assert(stream)

        console.log("TEST: CREATE STREAM FROM")
        return multichain.create({
            type: "stream",
            name: "stream2",
            open: true,
            from: state.address2,
            details: {
                "something": "yes"
            }
        })
    })
    .then(stream2 => {
        assert(stream2)

        console.log("TEST: LIST STREAMS")
        return multichain.listStreams()
    })
    .then(streamList => {
        assert.equal(streamList.length, 3)

        console.log("TEST: SUBSCRIBE STREAM")
        return multichain.subscribe({
            stream: "stream1"
        })
    })
    .then(subscribed => {
        console.log("TEST: PUBLISH STREAM")
        return multichain.publish({
            stream: "stream1",
            key: "test1",
            data: new Buffer("some stream data").toString("hex")
        })
    })
    .then(hexstring => {
        assert(hexstring)

        console.log("TEST: PUBLISH FROM")
        return multichain.publishFrom({
            from: state.address2,
            stream: "stream1",
            key: "test2",
            data: new Buffer("some more stream data").toString("hex")
        })
    })
    .then(hexstring => {
        assert(hexstring);

        console.log("TEST: LIST STREAM KEYS");
        return multichain.listStreamKeys({
            stream: "stream1"
        })
    })
    .then(streamKeys => {
        assert.equal(streamKeys.length, 2);

        console.log("TEST: LIST STREAM KEY ITEMS");
        return multichain.listStreamKeyItems({
            stream: "stream1",
            key: "test1",
            verbose: true
        })
    })
    .then(streamKeyItems => {
        assert.equal(streamKeyItems.length, 1);
        assert.equal(streamKeyItems[0].key, "test1");
        state.streamData = streamKeyItems[0].data;

        console.log("TEST: GET TXOUTDATA")
        return multichain.getTxOutData({
            txid: streamKeyItems[0].txid,
            vout: 0
        })

    })
    .then(txData => {
        assert(txData)
        assert.equal(txData, state.streamData)

        console.log("TEST: LIST STREAM ITEMS")
        return multichain.listStreamItems({
            stream: "stream1",
            verbose: true
        })
    })
    .then(streamItems => {
        assert(streamItems)
        assert.equal(streamItems.length, 2)

        console.log("TEST: LIST STREAM PUBLISHER ITEMS")
        return multichain.listStreamPublisherItems({
            stream: "stream1",
            address: state.address2,
            verbose: true
        })
    })
    .then(getStreamItem => {
        console.log("TEST: GET STREAM ITEM");
        return multichain.getStreamItem({
            stream: "stream1",
            txid: getStreamItem[0].txid
        })
    })
    .then(streamPublisherItems => {
        assert(streamPublisherItems)

        console.log("TEST: LIST STREAM PUBLISHERS")
        return multichain.listStreamPublishers({
            stream: "stream1"
        })
    })
    .then(streamPublishers => {
        assert(streamPublishers)

        console.log("TEST: UNSUBSCRIBE")
        return multichain.unsubscribe({
            stream: "stream1"
        })
    })
    .then(unsubbed => {

        console.log("TEST: PAUSE")
        return multichain.pause({
            tasks: "mining,incoming"
        })
    })
    .then(() => {

        console.log("TEST: SET LAST BLOCK")
        return multichain.setLastBlock({
            hash: "1"
        })
    })
    .then(hash => {
        assert(hash);

        console.log("TEST: CLEAR MEMPOOL")
        return multichain.clearMempool()
    })
    .then(() => {
        console.log("TEST: RESUME")
        return multichain.resume({
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
