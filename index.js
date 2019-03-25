const Client = require('fabric-client')
const fs = require('fs')
const path = require('path')

const mspDir = '../network/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/'

function loadKeyAndCert(){
  let ret = {}
  let keys = fs.readdirSync(path.join(mspDir,'keystore'))
  if(keys.length === 0) throw "no key found"
  ret.privateKeyPEM = fs.readFileSync(path.join(mspDir,'keystore',keys[0]),'utf8')
  let certs = fs.readdirSync(path.join(mspDir,'signcerts'))
  if(certs.length === 0) throw "no cert found"
  ret.signedCertPEM = fs.readFileSync(path.join(mspDir,'signcerts',certs[0]),'utf8')
  return ret
}

async function init(){
  let client = new Client
  let user = await client.createUser({
    username: 'admin',
    mspid: 'Org1MSP',
    cryptoContent: loadKeyAndCert(),
    skipPersistence: true	    
  })
  client.setUserContext(user,true)
  let channel = client.newChannel('ch1')
  let peer = client.newPeer('grpc://127.0.0.1:7051',{})
  channel.addPeer(peer)
  let orderer = client.newOrderer('grpc://127.0.0.1:7050',{})
  channel.addOrderer(orderer)
  return {client,channel,orderer,peer}
}

async function query(ctx,ccid,method){
  let req = {
    chaincodeId: ccid,
    fcn: method,
    args: Array.prototype.slice.call(arguments,3)
  }
  return await ctx.channel.queryByChaincode(req)
}

async function invoke(ctx,ccid,method){
  let req = {
    chaincodeId: ccid,
    fcn: method,
    args: Array.prototype.slice.call(arguments,3),
    txId: ctx.client.newTransactionID()
  }
  let rsp = await ctx.channel.sendTransactionProposal(req)
  let ret = await ctx.channel.sendTransaction({
    proposalResponses: rsp[0],
    proposal: rsp[1]
  })
  return ret
}

async function main(){
  let ctx = await init()

  console.log(await query(ctx,'wizcc'))
  console.log(await invoke(ctx,'wizcc'))
}

main()
