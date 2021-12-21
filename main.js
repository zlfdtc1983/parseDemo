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
  Parse.pu
  return "not ready";
});



//////////////////////// SCHEMA ///////////////////////////////////
// name: contest name, string
// type: 0:学生, 1:家长， 2:机构/学校, 3: 普通用户 int
// uid:  int32
// serial_number:   judges array
// state:  0: 未认证, 1: 认证通过
// parant: []  数组，监护人
// children: [] 数组，孩子
// token: 登陆token，string
// deviceToken: 用来push消息，string
Parse.Cloud.define("ceateAccount", async (request) => {
  return "not ready";
});

Parse.Cloud.define("bindGuardian", async (request) => {
  // 向要绑定的家长推送消息
  Parse.Push.send({
    channels: ["News"],
    data: {
        title: "Hello from the Cloud Code",
        alert: "Back4App rocks!",
    }
  }, { useMasterKey: true });


  return "not ready";
});

Parse.Cloud.define("acceptBindGuardian", async (request) => {
  // 向要绑定的家长推送消息
  //向家长和孩子都要推送消息（是不是只给孩子推送即可）
  return "not ready";
});

Parse.Cloud.define("rejectBindGuardian", async (request) => {
  // 向孩子推送消息
  return "not ready";
});

Parse.Cloud.define("verifyStudent", async (request) => {
  // 建立认证单子，
  // 向学校推送消息
  return "not ready";
});

Parse.Cloud.define("approveVerify", async (request) => {
  // 更新认证单子
  // 向学生推送认证通过消息
  return "not ready";
});

Parse.Cloud.define("rejectVerify", async (request) => {
  // 更新认证单子
  // 向学生推送认证失败消息
  return "not ready";
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