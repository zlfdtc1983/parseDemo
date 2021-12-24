let configInfo = require("./config/config.json");
const RtcTokenBuilder = require('./agora/src/RtcTokenBuilder').RtcTokenBuilder;
const RtcRole = require('./agora/src/RtcTokenBuilder').Role;

function sleep(ms) {
  return new Promise(resolve=>setTimeout(resolve, ms))
}
async function doSomethingVeryLong(request){
  console.log("1111111111111111111111");
    await sleep(15000);
    console.log("2222222222222222222222");
    return "kkkkkkkkk";
}

Parse.Cloud.job("myjob",(request)=>{
  doSomethingVeryLong(request);
  return "";
});
/*
​Parse.Cloud.job("myJobtest", (request) =>  {
  ​const { params, headers, log, message } = request;
  ​message("I just started");
  ​return doSomethingVeryLong(request);
​});
*/
Parse.Cloud.define("getSMSVerifyCode", async (request) => {
  //
  return "not ready";
});



//////////////////////// SCHEMA ///////////////////////////////////
//////////////////////// ClassName: Account ///////////////////////////////////
// name: contest name, string
// type: 0: 普通用户,1:学生, 2:家长， 3:机构/学校,  int
// uid:  int32
// serial_number:   judges array
// state:  0: 未认证, 1: 认证通过
// parants: []  数组，监护人
// children: [] 数组，孩子
// institutions: [] 机构  account
// token: 登陆token，string
// deviceToken: 用来push消息，string
Parse.Cloud.define("ceateAccount", async (request) => {
  console.dir("enter ceateAccount" );
  let name = request.params.name;
  let uid = request.params.uid;
  let type = request.params.type;
  let serial_number = request.params.serial_number;
  if(!name || !uid || !type){
    return {"code":-1, "msg":"param missing"}
  }

  const query = new Parse.Query("Account");
  query.equalTo("uid", uid);
  let count = await query.count();
  if(count>0){
    return {"code":-2, "msg":"uid already exist"}
  }

  let accountObject = new Parse.Object("Account");
  accountObject.set("name", name);
  accountObject.set("uid", uid);
  accountObject.set("type", type);
  accountObject.set("state", 0);
  let saveRes = await accountObject.save();
  console.dir(saveRes);

  return {"code":0, "msg":"OK", "data":saveRes};
});


//////////////////////// SCHEMA ///////////////////////////////////
//////////////////////// ClassName: VerifyEvents ///////////////////////////////////
// type:     0:家长和孩子的认证， 1：学生和机构的认证，2：老师和机构的认证
// uid_to_verify:   要被认证的uid
// uid_verify:   认证账号的uid
// state:       0:未认证  1: 认证通过   2: 认证失败
Parse.Cloud.define("bindGuardian", async (request) => {
  // 向要绑定的家长推送消息
  
  const query = new Parse.Query("VerifyEvents");
  let uid_to_verify = request.params.uid_to_verify;
  let uid_verify = request.params.uid_verify;
  let type = request.params.type;
  console.dir(request.params);
  query.equalTo("uid_to_verify", uid_to_verify);
  query.equalTo("uid_verify", uid_verify);
  query.equalTo("type", type);
  let verifyEvents = await query.first();
  let event_id = "";
  if(verifyEvents){
    console.log("111111111111111111111111111111111111111111111111111111111111111");
    verifyEvents.set("state",0);
    let saveRes = await verifyEvents.save();
    event_id = saveRes.id;
    console.log(event_id);
  }else{
    console.log("2222222222222222222222222222222222222222");
    let verifyEventObj = new Parse.Object("VerifyEvents");
    verifyEventObj.set("uid_to_verify", uid_to_verify);
    verifyEventObj.set("uid_verify", uid_verify);
    verifyEventObj.set("type", type);
    verifyEventObj.set("state", 0);
    let saveRes = await verifyEventObj.save();
    event_id = saveRes.id;
    console.log(event_id);
  }

  let channel_id = "" + uid_verify;
/*
  Parse.Push.send({
    channels: [channel_id],
    data: {
        title: "请您认证您的孩子",
        alert: channel_id,
    }
  }, { useMasterKey: true });
*/

return {"code":0, "msg":"OK", "event_id":event_id};
  
});

Parse.Cloud.define("acceptBindGuardian", async (request) => {
  // 向要绑定的家长推送消息
  //向家长和孩子都要推送消息（是不是只给孩子推送即可）
  let objectId = request.params.objectId;
  const queryEvent = new Parse.Query("VerifyEvents");
  // queryEvent.equalTo("objectId", objectId);
  // let verifyEventObj = await queryEvent.first();
  let verifyEventObj = await queryEvent.get(objectId); // 和上面注释中的功能等同
  if(!verifyEventObj){
    return {"code":-1, "msg":"VerifyEvent not exist"};
  }

  const query = new Parse.Query("Account");
  let uid = verifyEventObj.get("uid_to_verify");
  let guardian_uid = verifyEventObj.get("uid_verify");
  query.equalTo("uid", guardian_uid);
  let parantObj = await query.first();
  if(!parantObj){
    return {"code":-3, "msg":"guardian_uid not exist in db"};
  }
  const query2 = new Parse.Query("Account");
  query2.equalTo("uid", uid);
  let childObj = await query2.first();
  if(!childObj){
    return {"code":-3, "msg":"child uid not exist in db"};
  }
  let parants = childObj.get("parants");
  if(!parants){
    parants = [];
  }
  let hasBind = false;
  for (let i = 0; i < parants.length; ++i) {
    if(parants[i].get("uid")==guardian_uid){
      hasBind = true;
      break;
    }
  }
  if(!hasBind){
    parants.push(parantObj);
    childObj.set("parants",parants);
    let saveRes = await childObj.save();
    console.dir(saveRes);
  }

  let children = parantObj.get("children");
  if(!children){
    children = [];
  }
  let hasBindChild = false;
  for (let i = 0; i < children.length; ++i) {
    if(children[i].get("uid")==uid){
      hasBindChild = true;
      break;
    }
  }

  if(!hasBindChild){
    children.push(childObj);
    parantObj.set("children",children);
    parantObj.save();
  }

  let guardian_name = parantObj.get("name");
  let channel_id = "" + uid;
  Parse.Push.send({
    channels: [channel_id],
    data: {
        title: guardian_name+"已经和您绑定监护关系",
        alert: channel_id,
    }
  }, { useMasterKey: true });

  verifyEventObj.set("state", 1);
  await verifyEventObj.save();

  return {"code":0, "msg":"OK"};
});

Parse.Cloud.define("rejectBindGuardian", async (request) => {
  // 向孩子推送消息
  let objectId = request.params.objectId;
  const queryEvent = new Parse.Query("VerifyEvents");
  queryEvent.equalTo("objectId", objectId);
  let verifyEventObj = await queryEvent.first();
  if(!verifyEventObj){
    return {"code":-1, "msg":"VerifyEvent not exist"};
  }


  const query = new Parse.Query("Account");
  let uid = verifyEventObj.get("uid_to_verify");
  let guardian_uid = verifyEventObj.get("uid_verify");
  query.equalTo("uid", guardian_uid);
  let parantObj = await query.first();
  if(!parantObj){
    return {"code":-3, "msg":"guardian_uid not exist in db"};
  }
  const query2 = new Parse.Query("Account");
  query2.equalTo("uid", uid);
  let childObj = await query2.first();
  if(!childObj){
    return {"code":-3, "msg":"child uid not exist in db"};
  }

  let guardian_name = parantObj.get("name");
  let channel_id = "" + uid;
  Parse.Push.send({
    channels: [channel_id],
    data: {
        title: guardian_name+"拒绝了您的绑定请求",
        alert: channel_id,
    }
  }, { useMasterKey: true });

  verifyEventObj.set("state", 2);
  await verifyEventObj.save();

  return {"code":0, "msg":"OK"};
});

Parse.Cloud.define("verifyStudent", async (request) => {
  // 建立认证单子，
  // 向学校推送消息
  const query = new Parse.Query("VerifyEvents");
  let uid_to_verify = request.params.uid_to_verify;
  let uid_verify = request.params.uid_verify;
  let type = request.params.type;
  query.equalTo("uid_to_verify", uid_to_verify);
  query.equalTo("uid_verify", uid_verify);
  query.equalTo("type", type);
  let verifyEvents = await query.first();
  let event_id = "";
  if(verifyEvents){
    verifyEvents.set("state",state);
    let saveRes = await verifyEvents.save();
    event_id = saveRes.get("objectId");
  }else{
    let verifyEventObj = new Parse.Object("VerifyEvents");
    verifyEventObj.set("uid_to_verify", uid_to_verify);
    verifyEventObj.set("uid_verify", uid_verify);
    verifyEventObj.set("type", type);
    verifyEventObj.set("state", 0);
    let saveRes = await verifyEventObj.save();
    event_id = saveRes.get("objectId");
  }

  let channel_id = "" + uid_verify;

  Parse.Push.send({
    channels: [channel_id],
    data: {
        title: "请您认证此学生",
        alert: channel_id,
    }
  }, { useMasterKey: true });


  return {"code":0, "msg":"OK", "event_id":event_id};

});

Parse.Cloud.define("approveStudentVerify", async (request) => {
  // 更新认证单子
  // 向学生推送认证通过消息
  let objectId = request.params.objectId;
  const queryEvent = new Parse.Query("VerifyEvents");
  queryEvent.equalTo("objectId", objectId);
  let verifyEventObj = await queryEvent.first();
  if(!verifyEventObj){
    return {"code":-1, "msg":"VerifyEvent not exist"};
  }

  const query = new Parse.Query("Account");
  let uid = verifyEventObj.get("uid_to_verify");
  let school_uid = verifyEventObj.get("uid_verify");
  query.equalTo("uid", school_uid);
  let schoolObj = await query.first();
  if(!schoolObj){
    return {"code":-3, "msg":"school_uid not exist in db"};
  }
  const query2 = new Parse.Query("Account");
  query2.equalTo("uid", uid);
  let studentObj = await query2.first();
  if(!studentObj){
    return {"code":-3, "msg":"student uid not exist in db"};
  }
  let institutions = studentObj.get("institutions");
  if(!institutions){
    institutions = [];
  }
  let hasBind = false;
  for (let i = 0; i < institutions.length; ++i) {
    if(institutions[i].get("uid")==guardian_uid){
      hasBind = true;
      break;
    }
  }
  if(!hasBind){
    institutions.push(parantObj);
    childObj.set("institutions",institutions);
    let saveRes = await childObj.save();
    console.dir(saveRes);
  }
/*
  let children = parantObj.get("children");
  if(!children){
    children = [];
  }
  let hasBindChild = false;
  for (let i = 0; i < children.length; ++i) {
    if(children[i].get("uid")==uid){
      hasBindChild = true;
      break;
    }
  }

  if(!hasBindChild){
    children.push(childObj);
    parantObj.set("children",children);
    parantObj.save();
  }
*/
  let school_name = schoolObj.get("name");
  let channel_id = "" + uid;
  Parse.Push.send({
    channels: [channel_id],
    data: {
        title: school_name+"已经和您绑定监护关系",
        alert: channel_id,
    }
  }, { useMasterKey: true });

  verifyEventObj.set("state", 1);
  await verifyEventObj.save();

  return {"code":0, "msg":"OK"};
});

Parse.Cloud.define("rejectStudentVerify", async (request) => {
  // 更新认证单子
  // 向学生推送认证失败消息

  let objectId = request.params.objectId;
  const queryEvent = new Parse.Query("VerifyEvents");
  queryEvent.equalTo("objectId", objectId);
  let verifyEventObj = await queryEvent.first();
  if(!verifyEventObj){
    return {"code":-1, "msg":"VerifyEvent not exist"};
  }


  const query = new Parse.Query("Account");
  let uid = verifyEventObj.get("uid_to_verify");
  let school_uid = verifyEventObj.get("uid_verify");
  query.equalTo("uid", school_uid);
  let schoolObj = await query.first();
  if(!schoolObj){
    return {"code":-3, "msg":"school_uid not exist in db"};
  }
  const query2 = new Parse.Query("Account");
  query2.equalTo("uid", uid);
  let studentObj = await query2.first();
  if(!studentObj){
    return {"code":-3, "msg":"student uid not exist in db"};
  }

  let school_name = schoolObj.get("name");
  let channel_id = "" + uid;
  Parse.Push.send({
    channels: [channel_id],
    data: {
        title: school_name+"拒绝了您的认证请求",
        alert: channel_id,
    }
  }, { useMasterKey: true });

  verifyEventObj.set("state", 2);
  await verifyEventObj.save();

  return {"code":0, "msg":"OK"};
});



Parse.Cloud.define("getAgoraToken", async (request) => {
  let token = request.params.token;
  console.log("token=======" + token);
  // 通过token和比赛id获得用户的uid以及比赛信息
  let channelName = 'testflutterlf2';
  let uid = 2882341276;
  let expirationTimeInSeconds = 7200
  let currentTimestamp = Math.floor(Date.now() / 1000)
  let privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds
  let role = RtcRole.PUBLISHER;
  let channel_token = RtcTokenBuilder.buildTokenWithUid(configInfo.agora_appid, configInfo.agora_appCertificate, 
    channelName, uid, role, privilegeExpiredTs);
  console.log("Token With Integer Number Uid: " + channel_token);
  return {"channel_token":channel_token};
});


// 有效的时间slot
Parse.Cloud.define("validTimeSlot", async (request) => {
  return "not ready";
});


//////////////////////// SCHEMA ///////////////////////////////////
// name: contest name, string
// channel_name: contest name, string
// type: contest type, int
// start_time:   Date
// end_time: Date
// players:  array for users
// judges:   judges array
// state:  0: just construct, 1: judges ready, 2: 审核通过， 3：审核失败，4：支付完成
Parse.Cloud.define("addContest", async (request) => {
  return "not ready";
});

//按照时间先后获取列表
Parse.Cloud.define("getContestList", async (request) => {
  return "not ready";
});

// 邀请裁判，server同时给裁判发推送
Parse.Cloud.define("inviteJudge", async (request) => {
  return "not ready";
});

//裁判对邀请的回应
Parse.Cloud.define("judgeResponseForInvite", async (request) => {
  return "not ready";
});

// 审核结果
Parse.Cloud.define("applicationResult", async (request) => {
  return "not ready";
});


// 付款结果
Parse.Cloud.define("paymentForApplication", async (request) => {
  return "not ready";
});

//按照时间先后获取列表
Parse.Cloud.define("joinContest", async (request) => {
  return "not ready";
});

//按照时间先后获取列表
Parse.Cloud.define("bookContest", async (request) => {
  return "not ready";
});

Parse.Cloud.define("cloudCodeTest", async (request) => {
  return "Hello World";
});

Parse.Cloud.define("averageStars", async (request) => {
 
  let sum = {a:8}
 
  return sum;
});