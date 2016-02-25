//from-address / to-address simply called from and to
//data-hex called data, tx-hex called tx
//unnamed requested / locking assets object called "assets"
//listunspent: unnamed array of addresses called receivers
//lockunspent: unnamed array of outputs called outputs
//createrawtransaction: unnamed called inputs and amounts
//addnode: ip for ip:port

module.exports = {
    //general
    createMultiSig: ["nrequired", "keys"],
    getInfo: [],
    getBlockchainParams: [],
    help: [],
    stop: [],
    validateAddress: ["address"],
    //wallet addresses
    addMultiSigAddress: ["nrequired", "keys"],
    getAddresses: [{"verbose": false}],
    getNewAddress: [],
    importAddress: ["address", {"label": ""}, {"rescan": true}],
    //permissions
    grant: ["addresses", "permissions", {"native-amount":null}, {"start-block": null}, {"end-block": null}, {"comment": null}, {"comment-to": null}],
    grantFrom: ["from", "to", "permissions", {"native-amount":null}, {"start-block": null}, {"end-block": null}, {"comment": null}, {"comment-to": null}],
    listPermissions: [{"permissions": "all"}, {"addresses": "*"}, {"verbose": false}],
    revoke: ["addresses", "permissions", {"native-amount":0}, {"comment": ""}, {"comment-to": ""}],
    revokeFrom: ["from", "to", "permissions", {"native-amount":0}, {"comment": ""}, {"comment-to": ""}],
    //assets
    issue: ["address", "name", "qty", {"units": 1}, {"native-amount":0}, {"details": {}}],
    issueFrom: ["from", "to", "name", "qty", {"units": 1}, {"native-amount": 0}, {"details": {}}],
    listAssets: [{"asset": ""}],
    //querying
    getAddressBalances: ["address", {"minconf": 1}, {"includeLocked": false}],
    getAddressTransaction: ["address", "txid", {"verbose": false}],
    getTotalBalances: [{"minconf": 1}, {"includeWatchOnly": false}, {"includeLocked": false}],
    getWalletTransaction: ["txid", {"includeWatchOnly": false}, {"verbose": false}],
    listAddressTransactions: ["address", {"count": 10}, {"skip": 0}, {"verbose": false}],
    listWalletTransactions: [{"count": 10}, {"skip": 0}, {"includeWatchOnly": false}, {"verbose": false}],
    //sending
    sendAssetFrom: ["from", "to", "asset", "qty", {"native-amount":0}, {"comment": ""}, {"comment-to": ""}],
    sendAssetToAddress: ["address", "asset", "qty", {"native-amount": 0}, {"comment": ""}, {"comment-to": ""}],
    sendFromAddress: ["from", "to", "amount", {"comment": ""}, {"comment-to": ""}],
    sendToAddress: ["address", "amount", {"comment": ""}, {"comment-to": ""}],
    sendWithMetadata: ["address", "amount", "data"],
    sendWithMetadataFrom: ["from", "to", "amount", "data"],
    //atomic exchange
    appendRawExchange: ["hexstring", "txid", "vout", "assets"],
    createRawExchange: ["txid", "vout", "assets"],
    decodeRawExchange: ["hexstring", {"verbose": false}],
    disableRawTransaction: ["hexstring"],
    prepareLockUnspent: ["assets", {"lock": true}],
    prepareLockUnspentFrom: ["from", "assets", {"lock": true}],
    //unspent
    combineUnspent: [{"addresses": "*"}, {"minconf": 1}, {"maxcombines": 1}, {"mininputs": 10}, {"maxinputs": 100}, {"maxtime": 30}],
    listLockUnspent: [],
    listUnspent: [{"minconf": 1}, {"maxconf": 999999}, {"receivers": []}],
    lockUnspent: ["unlock", {"outputs": []}],
    //raw tx
    appendRawChange: ["hexstring", "address", {"native-fee": undefined}],
    appendRawMetadata: ["tx", "data"],
    createRawTransaction: ["inputs", "amounts"],
    decodeRawTransaction: ["hexstring"],
    sendRawTransaction: ["hexstring"],
    signRawTransaction: ["hexstring"],
    //p2p
    addNode: ["ip", "command"],
    getPeerInfo: [],
    ping: [],
    //messaging
    signMessage: ["address", "message"],
    verifyMessage: ["address", "signature", "message"],
    //blockchain query
    getBlock: ["hash", {"format": true}],
    getBlockHash: ["height"],
    getRawTransaction: ["txid", {"verbose": 0}],
    getTxOut: ["txid", "vout", {"unconfirmed": false}],
}