let UUID = require('uuid');
let configInfo = require("./config/config.json");
const RtcTokenBuilder = require('./agora/src/RtcTokenBuilder').RtcTokenBuilder;
const RtcRole = require('./agora/src/RtcTokenBuilder').Role;
const ErrorCode = require('./data/error_code');
let TokenMap = {};
const TOKEN_EXPIRE_TIME = 24*60*60; // 单位秒

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

function checkUserValid(request){
  let token = request.params.token;
  if(!token){
    return false;
  }
  let tokenInfo = TokenMap[token];
  if(!tokenInfo){
    return false;
  }
  let curDate = new Date();
  if((curDate - tokenInfo.CreateTime)>TOKEN_EXPIRE_TIME*1000){
    return false;
  }
  request.params.accountId = tokenInfo.userid;
  return true;
}





/*
​Parse.Cloud.job("myJobtest", (request) =>  {
  ​const { params, headers, log, message } = request;
  ​message("I just started");
  ​return doSomethingVeryLong(request);
​});
*/

//////////////////////// SCHEMA ///////////////////////////////////
//////////////////////// ClassName: VerifyCode ///////////////////////////////////
// code: 验证码
// used：0：未使用，1：已使用

Parse.Cloud.define("sendSMSVerifyCode", async (request) => {
  var Num="";
  for(var i=0;i<6;i++)
  {
     Num+=Math.floor(Math.random()*10);
  }
  //send SMS code to mobile
  let verifyCodeObject = new Parse.Object("VerifyCode");
  verifyCodeObject.set("code", Num);
  verifyCodeObject.set("used", 0);
  await verifyCodeObject.save();
  return {"code":ErrorCode.SUCCESS, "msg":"OK"};
});

Parse.Cloud.define("VerifySMSCode", async (request) => {
  //
  return "not ready";
});




Parse.Cloud.define("registerOrganizaton", async (request) => {
  let englishName = request.params.englishName;
  let chineseName = request.params.chineseName;
  let displayName = request.params.displayName;
  let legalName = request.params.legalName;
  let orgType = request.params.orgType;
  let licenseNumber = request.params.licenseNumber;
  let address = request.params.address;
  let phone = request.params.phone;
  let email = request.params.email;
  let contactPerson = request.params.contactPerson;

  let organizatonObject = new Parse.Object("organizaton");
  organizatonObject.set("englishName",englishName);
  organizatonObject.set("chineseName",chineseName);
  organizatonObject.set("displayName",displayName);
  organizatonObject.set("legalName",legalName);
  organizatonObject.set("orgType",orgType);
  organizatonObject.set("licenseNumber",licenseNumber);
  organizatonObject.set("address",address);
  organizatonObject.set("phone",phone);
  organizatonObject.set("email",email);
  organizatonObject.set("contactPerson",contactPerson);

  if(orgType=="institution"){
    let institutionProfile = request.params.institutionProfile;
    if(!institutionProfile){
      organizatonObject.set("institutionProfile",institutionProfile);
    }
  }else if(orgType=="school"){
    let schoolProfile = request.params.schoolProfile;
    if(!schoolProfile){
      organizatonObject.set("schoolProfile",schoolProfile);
    }
  }

  let saveRes = await organizatonObject.save();
  return {"code":ErrorCode.SUCCESS, "organizaton":saveRes};

});


Parse.Cloud.define("registerAccount", async (request) => {
  let userName = request.params.userName;
  let firstName = request.params.firstName;
  let lastName = request.params.lastName;
  let email = request.params.email;
  let mobile = request.params.mobile;
  let role = request.params.role;
  let age = request.params.age;
  let password = request.params.password;
  const query = new Parse.Query("account");
  query.equalTo("userName", userName);
  let count = await query.count();
  if(count>0){
    return {"code":ErrorCode.UserAlreadyExist, "msg":"username already exist"};
  }

  let accountObject = new Parse.Object("account");
  accountObject.set("userName", userName);
  accountObject.set("firstName", firstName);
  accountObject.set("lastName", lastName);
  accountObject.set("email", email);
  accountObject.set("mobile", mobile);
  accountObject.set("role", role);
  accountObject.set("age", age);
  accountObject.set("password", password);
  if(age>=16){
    accountObject.set("isAbove16", true);
  }else{
    accountObject.set("isAbove16", false);
  }

  if(role=="student"){
    let studentProfile = request.params.studentProfile;
    accountObject.set("studentProfile", studentProfile);
  }else if(role=="teacher"){
    let teacherProfile = request.params.teacherProfile;
    accountObject.set("teacherProfile", teacherProfile);
  }

  let workPeriods = request.params.workPeriods;
  if(workPeriods){
    accountObject.set("workPeriods", workPeriods);
  }

  let saveRes = await accountObject.save();
  return {"code":ErrorCode.SUCCESS, "user":saveRes};
});

Parse.Cloud.define("login", async (request) => {
  // 
  let type = request.params.type;
  const query = new Parse.Query("account");
  if(type=="username"){
    let userName = request.params.userName;
    let password = request.params.password;
    query.equalTo("userName", userName);
    query.equalTo("password", password);
  }else if(type=="facebook"){
    let id = request.params.id;
    let access_token = request.params.access_token;
  }else if(type=="wechat"){
    let id = request.params.id;
    let access_token = request.params.access_token;
  }else if(type=="sms"){
    let id = request.params.mobile;
    let verifyCode = request.params.verifyCode;
  }
  let accountObj = await query.first();
  if(!accountObj){
    return {"code":ErrorCode.LoginFailed, "msg":"login failed"}
  }
  let token = UUID.v1();
  accountObj.set("token",token);
  let curDate = new Date();
  accountObj.set("tokenDate",curDate);
  await accountObj.save();
  return {"code":ErrorCode.LoginFailed, "token":token};
});


Parse.Cloud.define("getIdleJudges", async (request) => {
  if(!checkUserValid(request)){
    return {"code":ErrorCode.TokenInvalid, "msg":ErrorCode.TokenInvalidMsg};
  }

  let accountId = request.params.accountId;
  const connectionQuery = new Parse.Query("connection");
  connectionQuery.equalTo("user", accountId);
  let connectionObj = await connectionQuery.first();
  if(!connectionObj){
    return {"code":ErrorCode.ConnectionNotExist, "msg":ErrorCode.ConnectionNotExistStr};
  }

  let startTime = new Date(request.params.startTime);
  let endTime = new Date(request.params.endTime);

  let teachers = connectionObj.get("teachers");

  let weekday = 1;
  const workPeriodQuery = new Parse.Query("work-period");
  workPeriodQuery.containedBy("userid",teachers);
  workPeriodQuery.equalTo("weekday",weekday);
  workPeriodQuery.lessThanOrEqualTo("startTime",startTime );
  workPeriodQuery.greaterThanOrEqualTo("endTime",endTime);
  let workPeriodsObjs = await workPeriodQuery.find();
  let validUsers = [];
  for(let i=0; i<workPeriodsObjs.length; i++){
    validUsers.push(workPeriodsObjs[i].get("userid"));
  }

  const engagedTimeQuery = new Parse.Query("engaged-time");
  engagedTimeQuery.containedBy("userid",validUsers);

  const engagedTimeQuery1 = new Parse.Query("engaged-time");
  engagedTimeQuery1.greaterThan("startTime",startTime);
  engagedTimeQuery1.lessThan("startTime",endTime);

  const engagedTimeQuery2 = new Parse.Query("engaged-time");
  engagedTimeQuery2.greaterThan("endTime",startTime);
  engagedTimeQuery2.lessThan("endTime",endTime);

  const engagedTimeQuery3 = new Parse.Query("engaged-time");
  engagedTimeQuery3.greaterThanOrEqualTo("endTime",endTime );
  engagedTimeQuery3.lessThanOrEqualTo("startTime",startTime);
  const mainQuery = Parse.Query.and(engagedTimeQuery,Parse.Query.or(engagedTimeQuery1,engagedTimeQuery2,engagedTimeQuery3));
  let engagedTimeObjs = await mainQuery.find();
  for(let j=0; j<engagedTimeObjs.length; j++){
    let userid = engagedTimeObjs[j].get("userid");
    let index = validUsers.indexOf(userid);
    if(index>-1){
      validUsers.splice(index,1);
    }
  }

  const AccountQuery = new Parse.Query("Account");
  AccountQuery.containedBy("userid",validUsers);
  let judges = await AccountQuery.find();
  return {"code":0, "validjudges":judges};
  
 
});

Parse.Cloud.define("createCompetition", async (request) => {

  if(!checkUserValid(request)){
    return {"code":ErrorCode.TokenInvalid, "msg":ErrorCode.TokenInvalidMsg};
  }


  let title = request.params.title;
  let summary = request.params.summary;
  let competitionType = request.params.competitionType;
  let organizer = request.params.organizer;
  let organizerType = request.params.organizerType;
  let status = request.params.status;
  let datetime = request.params.datetime;
  let duration = request.params.duration;
  let instrument = request.params.instrument;
  let timeLimit = request.params.timeLimit;
  let music = request.params.music;
  let minEntryAge = request.params.minEntryAge;
  let maxEntryAge = request.params.maxEntryAge;
  let maxCompetitors = request.params.maxCompetitors;
  


  let competitionObject = new Parse.Object("competition");
  competitionObject.set("title", title);
  competitionObject.set("summary", summary);
  competitionObject.set("competitionType", competitionType);
  competitionObject.set("organizer", organizer);
  competitionObject.set("organizerType", organizerType);
  competitionObject.set("status", status);
  competitionObject.set("datetime", datetime);
  competitionObject.set("duration", duration);
  competitionObject.set("instrument", instrument);
  competitionObject.set("timeLimit", timeLimit);
  competitionObject.set("minEntryAge", minEntryAge);
  competitionObject.set("maxEntryAge", maxEntryAge);
  competitionObject.set("maxCompetitors", maxCompetitors);
  

  let saveRes = await competitionObject.save();
  return {"code":ErrorCode.SUCCESS,  "data":saveRes};
});


// 邀请裁判
Parse.Cloud.define("inviteCompetitionJudge", async (request) => {
  if(!checkUserValid(request)){
    return {"code":ErrorCode.TokenInvalid, "msg":ErrorCode.TokenInvalidMsg};
  }

  let competitionId = request.params.competitionId;
  let inviteeId = request.params.inviteeId;
  let inviterId = request.params.accountId;
  let inviteType = request.params.inviteType;
  let inviteRequestObj = new Parse.Query("invite-request");
  inviteRequestObj.set("inviter",inviterId);
  inviteRequestObj.set("inviteeId",inviteeId);
  inviteRequestObj.set("inviteType",inviteType);
  inviteRequestObj.set("relatedId",competitionId);
  inviteRequestObj.set("status","pending");
  await inviteRequestObj.save();
  return {"code":ErrorCode.SUCCESS,  "msg":ErrorCode.SuccessStr};
  

  // let objectId = request.params.objectId;
  // if(!objectId){
  //   return {"code":ErrorCode.CompetitionNotExist,  "msg":ErrorCode.CompetitionNotExistStr};
  // }
  // const competitionQuery = new Parse.Query("competition");
  // let competitionObj = await competitionQuery.get(objectId);
  // if(!competitionObj){
  //   return {"code":ErrorCode.CompetitionNotExist,  "msg":ErrorCode.CompetitionNotExistStr};
  // }

  // let judgeId = request.params.judgeId;
  // if(!judgeId){
  //   return {"code":ErrorCode.JudgeNotExist,  "msg":ErrorCode.JudgeNotExistStr};
  // }
  // const accountQuery = new Parse.Query("account");
  // let judgeObj = await accountQuery.get(judgeId);
  // if(!judgeObj){
  //   return {"code":ErrorCode.JudgeNotExist,  "msg":ErrorCode.JudgeNotExistStr};
  // }

  // let judges = competitionObj.get("judges");
  // for(let i = 0; i < judges.length; i++){
  //   if(judges[i]==judgeId){
  //     // 已经存在就直接返回，还是报错好？
  //     return {"code":ErrorCode.SUCCESS,  "msg":ErrorCode.SuccessStr};
  //   }
  // }

  // // 给裁判发推送（未写）
  

  // let judgeStates = competitionObj.get("judgeStates");
  // judges.push(judgeId);
  // judgeStates.push("pending");
  // competitionObj.set("judges",judges);
  // competitionObj.set("judgeStates",judgeStates);
  // await competitionObj.save();
  // return {"code":ErrorCode.SUCCESS,  "msg":ErrorCode.SuccessStr};


});

// 裁判接受邀请
Parse.Cloud.define("competitionJudgeAccepted", async (request) => {
  if(!checkUserValid(request)){
    return {"code":ErrorCode.TokenInvalid, "msg":ErrorCode.TokenInvalidMsg};
  }
  let inviteId = request.params.inviteId;
  const inviteRequestQuery = new Parse.Query("invite-request");
  let inviteObj = await inviteRequestQuery.get(inviteId);
  if(!inviteObj){
    return {"code":ErrorCode.InviteRequestNotExist,  "msg":ErrorCode.InviteRequestNotExistStr};
  }

  let competitionId = inviteObj.get("relatedId");
  let judgeId = request.params.accountId;
  const competitionQuery = new Parse.Query("competition");
  let competitionObj = await competitionQuery.get(competitionId);
  if(!competitionObj){
    return {"code":ErrorCode.CompetitionNotExist,  "msg":ErrorCode.CompetitionNotExistStr};
  }

  let judges = competitionObj.get("judges");
  let judgeIndex = -1; 
  for(let i = 0; i < judges.length; i++){
    if(judges[i]==judgeId){
      judgeIndex = i;
      break;
    }
  }
  if(judgeIndex == -1){
    return {"code":ErrorCode.JudgeNotInCompetition,  "msg":ErrorCode.JudgeNotInCompetitionStr};
  }
  judges.push(judgeId);
  competitionObj.set("judges",judges);
  await competitionObj.save();

  inviteObj.set("status","accepted");
  await inviteObj.save();
  // // 给组织者发推送（未写）
  return {"code":ErrorCode.SUCCESS,  "msg":ErrorCode.SuccessStr};

});

// 裁判拒绝邀请
Parse.Cloud.define("competitionJudgeRejected", async (request) => {
  if(!checkUserValid(request)){
    return {"code":ErrorCode.TokenInvalid, "msg":ErrorCode.TokenInvalidMsg};
  }
  let inviteId = request.params.inviteId;
  const inviteRequestQuery = new Parse.Query("invite-request");
  let inviteObj = await inviteRequestQuery.get(inviteId);
  if(!inviteObj){
    return {"code":ErrorCode.InviteRequestNotExist,  "msg":ErrorCode.InviteRequestNotExistStr};
  }
  inviteObj.set("status","rejected");
  await inviteObj.save();
   // 给组织者发推送（未写）
   return {"code":ErrorCode.SUCCESS,  "msg":ErrorCode.SuccessStr};
  // let objectId = request.params.objectId;
  // let judgeId = request.params.accountId;
  // const competitionQuery = new Parse.Query("competition");
  // let competitionObj = await competitionQuery.get(objectId);
  // if(!competitionObj){
  //   return {"code":ErrorCode.CompetitionNotExist,  "msg":ErrorCode.CompetitionNotExistStr};
  // }

  // let judges = competitionObj.get("judges");
  // let judgeIndex = -1; 
  // for(let i = 0; i < judges.length; i++){
  //   if(judges[i]==judgeId){
  //     judgeIndex = i;
  //     break;
  //   }
  // }
  // if(judgeIndex == -1){
  //   return {"code":ErrorCode.JudgeNotInCompetition,  "msg":ErrorCode.JudgeNotInCompetitionStr};
  // }

  // let judgeStates = competitionObj.get("judgeStates");
  // judgeStates[judgeIndex] = "rejected";
  // competitionObj.set(judgeStates,judgeStates);
  // await competitionObj.save();
 
});



// 观众和参赛者都可以通过这接口加入
Parse.Cloud.define("joinCompetition", async (request) => {

  if(!checkUserValid(request)){
    return {"code":ErrorCode.TokenInvalid, "msg":ErrorCode.TokenInvalidMsg};
  }
  let objectId = request.params.objectId;
  let type = request.params.type;
  let accountId = request.params.accountId;
  if((type!="competitionant"&&type!="audience") || !objectId ){
    return {"code":ErrorCode.ParameterError,  "msg":ErrorCode.ParameterErrorStr};
  }

  const competitionQuery = new Parse.Query("competition");
  let competitionObj = await competitionQuery.get(objectId);
  if(!competitionObj){
    return {"code":ErrorCode.CompetitionNotExist,  "msg":ErrorCode.CompetitionNotExistStr};
  }

  if(type=="competitionant"){
    let competitionants = competitionObj.get(competitionants);
    let index = -1; 
    for(let i = 0; i < competitionants.length; i++){
      if(competitionants[i]==accountId){
        index = i;
        break;
      }
    }
    if(index > -1){
      return {"code":ErrorCode.AlreadyInCompetition,  "msg":ErrorCode.AlreadyInCompetitionStr};
    }
    competitionants.push(accountId);
    competitionObj.set("competitionants",competitionants);
  } else if(type=="audience"){
    let audiences = competitionObj.get(audiences);
    let index = -1; 
    for(let i = 0; i < audiences.length; i++){
      if(audiences[i]==accountId){
        index = i;
        break;
      }
    }
    if(index > -1){
      return {"code":ErrorCode.AlreadyInCompetition,  "msg":ErrorCode.AlreadyInCompetitionStr};
    }
    audiences.push(accountId);
    competitionObj.set("audiences",audiences);
  }
  await competitionObj.save();
  // 给组织者发推送（未写）
  return {"code":ErrorCode.SUCCESS,  "msg":ErrorCode.SuccessStr};


});


// 添加一个联系人
Parse.Cloud.define("connectionRequest", async (request) => {
  if(!checkUserValid(request)){
    return {"code":ErrorCode.TokenInvalid, "msg":ErrorCode.TokenInvalidMsg};
  }
  let invitee = request.params.invitee;
  let inviter = request.params.accountId;
  let connectRequestObject = new Parse.Object("connect-request");
  connectRequestObject.set("inviter",inviter);
  connectRequestObject.set("invitee",invitee);
  connectRequestObject.set("status","pending");
  let saveRes = await connectRequestObject.save(); 
  return {"code":ErrorCode.SUCCESS,  "data":saveRes};
});

// 联系人同意
Parse.Cloud.define("connectionApproved", async (request) => {
  
  if(!checkUserValid(request)){
    return {"code":ErrorCode.TokenInvalid, "msg":ErrorCode.TokenInvalidMsg};
  }

  let objectId = request.params.objectId;
  const connectRequestQuery = new Parse.Query("connect-request");
  let connectRequestObj = await connectRequestQuery.get(objectId);
  if(!connectRequestObj){
    return {"code":ErrorCode.NoConnectionRequest,  "msg":ErrorCode.NoConnectionRequestStr};
  }

  let inviter = connectRequestObj.get("inviter");
  let invitee = connectRequestObj.get("invitee");
  let status = connectRequestObj.get("status");
  if(status!="pending"){
    return {"code":ErrorCode.ConnectionRequestHasDealed,  "msg":ErrorCode.ConnectionRequestHasDealedStr};
  }

  const inviterQuery = new Parse.Query("account");
  let inviterObj = await inviterQuery.get(inviter); 
  if(!inviterObj){
    return {"code":ErrorCode.ConnectionRequestNotValid,  "msg":ErrorCode.ConnectionRequestNotValidStr};
  }

  const inviteeQuery = new Parse.Query("account");
  let inviteeObj = await inviterQuery.get(invitee); 
  if(!inviteeObj){
    return {"code":ErrorCode.ConnectionRequestNotValid,  "msg":ErrorCode.ConnectionRequestNotValidStr};
  }

  const inviterConnectionQuery = new Parse.Query("connection");
  inviterConnectionQuery.equalTo("userId", inviter);
  let inviterConnection = await inviterConnectionQuery.first();

  if(!inviterConnection){
    inviterConnection = new Parse.Object("connection");
    inviterConnection.set("userId", inviter);
  }
  if(inviteeObj.get("role")=="student"){
    let students = inviterConnection.get("students");
    if(!students){
      students = [];
    }
    students.push(inviteeObj);
    inviterConnection.set("students",students);
  }else if(inviteeObj.get("role")=="teachers"){
    let teachers = inviterConnection.get("teachers");
    if(!teachers){
      teachers = [];
    }
    teachers.push(inviteeObj);
    inviterConnection.set("teachers",teachers);
  }
  await inviterConnection.save();  

  const inviteeConnectionQuery = new Parse.Query("connection");
  inviteeConnectionQuery.equalTo("userId", invitee);
  let inviteeConnection = await inviteeConnectionQuery.first();
  if(!inviteeConnection){
    inviteeConnection = new Parse.Object("connection");
    inviteeConnection.set("userId", inviter);
  }

  if(inviterObj.get("role")=="student"){
    let students = inviteeConnection.get("students");
    if(!students){
      students = [];
    }
    students.push(inviterObj);
    inviteeConnection.set("students",students);
  }else if(inviterObj.get("role")=="teachers"){
    let teachers = inviteeConnection.get("teachers");
    if(!teachers){
      teachers = [];
    }
    teachers.push(inviterObj);
    inviteeConnection.set("teachers",teachers);
  }

  await inviteeConnection.save();  

  connectRequestObj.set("status","accepted");
  await connectRequestObj.save(); 
  return {"code":ErrorCode.SUCCESS, "msg":ErrorCode.SuccessStr};

});

// 联系人拒绝
Parse.Cloud.define("connectionRejected", async (request) => {
  if(!checkUserValid(request)){
    return {"code":ErrorCode.TokenInvalid, "msg":ErrorCode.TokenInvalidMsg};
  }

  let objectId = request.params.objectId;
  const connectRequestQuery = new Parse.Query("connect-request");
  let connectRequestObj = await connectRequestQuery.get(objectId);
  if(!connectRequestObj){
    return {"code":ErrorCode.NoConnectionRequest,  "msg":ErrorCode.NoConnectionRequestStr};
  }
  connectRequestObj.set();
  connectRequestObject.set("status","rejected");
  let saveRes = await connectRequestObject.save(); 
  return {"code":ErrorCode.SUCCESS, "msg":ErrorCode.SuccessStr};
});

Parse.Cloud.define("verificationRequest", async (request) => {
  if(!checkUserValid(request)){
    return {"code":ErrorCode.TokenInvalid, "msg":ErrorCode.TokenInvalidMsg};
  }

});


Parse.Cloud.define("bindGuardian", async (request) => {

  if(!checkUserValid(request)){
    return {"code":ErrorCode.TokenInvalid, "msg":ErrorCode.TokenInvalidMsg};
  }

  let invitee = request.params.invitee;
  let inviter = request.params.accountId;

  let verifyEventObj = new Parse.Object("verification-request");
    verifyEventObj.set("inviter", inviter);
    verifyEventObj.set("invitee", invitee);
    verifyEventObj.set("verificationType", "personal");
    verifyEventObj.set("verificationKind", "bindGuardian");
    verifyEventObj.set("status", "pending");
    let saveRes = await verifyEventObj.save();
    event_id = saveRes.id;

 

  // let channel_id = "" + uid_verify;

  // Parse.Push.send({
  //   channels: [channel_id],
  //   data: {
  //       title: "请您认证您的孩子",
  //       alert: channel_id,
  //   }
  // }, { useMasterKey: true });


  return {"code":0, "msg":"OK", "verify_id":event_id};
});


Parse.Cloud.define("acceptBindGuardian", async (request) => {
  // 向要绑定的家长推送消息
  //向家长和孩子都要推送消息（是不是只给孩子推送即可）
  if(!checkUserValid(request)){
    return {"code":ErrorCode.TokenInvalid, "msg":ErrorCode.TokenInvalidMsg};
  }

  let verifyReqId = request.params.verifyReqId;
  const verifyReqQuery = new Parse.Query("verification-request");
  let verifyReqObj = await verifyReqQuery.get(verifyReqId); // 和上面注释中的功能等同
  if(!verifyReqObj){
    return {"code":ErrorCode.VerifyReqNotExist, "msg":ErrorCode.VerifyReqNotExistStr};
  }

  const query = new Parse.Query("Account");
  let childId = verifyReqObj.get("inviter");
  let guardian_id = verifyReqObj.get("invitee");
  let parantObj = await query.get(guardian_id); 
  if(!parantObj){
    return {"code":ErrorCode.UserNotExist, "msg":ErrorCode.UserNotExistStr};
  }
  const query2 = new Parse.Query("Account");
  let childObj = await query2.get(childId); 
  if(!childObj){
    return {"code":ErrorCode.UserNotExist, "msg":ErrorCode.UserNotExistStr};
  }
  
  childObj.set("guardian",guardian_id);
  await childObj.save();

  verifyReqObj.set("status", "approved");
  await verifyReqObj.save();

  return {"code":ErrorCode.SUCCESS, "msg":ErrorCode.SuccessStr};
});

Parse.Cloud.define("rejectBindGuardian", async (request) => {
  if(!checkUserValid(request)){
    return {"code":ErrorCode.TokenInvalid, "msg":ErrorCode.TokenInvalidMsg};
  }

  let verifyReqId = request.params.verifyReqId;
  const verifyReqQuery = new Parse.Query("verification-request");
  let verifyReqObj = await verifyReqQuery.get(verifyReqId); // 和上面注释中的功能等同
  if(!verifyReqObj){
    return {"code":ErrorCode.VerifyReqNotExist, "msg":ErrorCode.VerifyReqNotExistStr};
  }
  verifyReqObj.set("status", "rejected");
  await verifyReqObj.save();

  return {"code":ErrorCode.SUCCESS, "msg":ErrorCode.SuccessStr};
});


Parse.Cloud.define("verifyStudent", async (request) => {
  if(!checkUserValid(request)){
    return {"code":ErrorCode.TokenInvalid, "msg":ErrorCode.TokenInvalidMsg};
  }

  let invitee = request.params.invitee;
  let inviter = request.params.accountId;

  let verifyEventObj = new Parse.Object("verification-request");
    verifyEventObj.set("inviter", inviter);
    verifyEventObj.set("invitee", invitee);
    verifyEventObj.set("verificationType", "organization");
    verifyEventObj.set("verificationKind", "verifyStudent");
    verifyEventObj.set("status", "pending");
    let saveRes = await verifyEventObj.save();
    event_id = saveRes.id;

  // 建立认证单子，
  // 向学校推送消息
  

  // let channel_id = "" + uid_verify;

  // Parse.Push.send({
  //   channels: [channel_id],
  //   data: {
  //       title: "请您认证此学生",
  //       alert: channel_id,
  //   }
  // }, { useMasterKey: true });


  return {"code":0, "msg":"OK", "verify_id":event_id};

});


Parse.Cloud.define("approveStudentVerify", async (request) => {

  if(!checkUserValid(request)){
    return {"code":ErrorCode.TokenInvalid, "msg":ErrorCode.TokenInvalidMsg};
  }

  let verifyReqId = request.params.verifyReqId;
  const verifyReqQuery = new Parse.Query("verification-request");
  let verifyReqObj = await verifyReqQuery.get(verifyReqId); // 和上面注释中的功能等同
  if(!verifyReqObj){
    return {"code":ErrorCode.VerifyReqNotExist, "msg":ErrorCode.VerifyReqNotExistStr};
  }

  const  studentQuery = new Parse.Query("Account");
  let studentId = verifyReqObj.get("inviter");
  let schoolId = verifyReqObj.get("invitee");
  let studentObj = await studentQuery.get(studentId); 
  if(!studentObj){
    return {"code":ErrorCode.UserNotExist, "msg":ErrorCode.UserNotExistStr};
  }
  const schoolQuery = new Parse.Query("organizaton");
  let schoolObj = await schoolQuery.get(schoolId); 
  if(!schoolObj){
    return {"code":ErrorCode.SchoolNotExist, "msg":ErrorCode.SchoolNotExistStr};
  }
  
  let studentProfile = studentObj.get("studentProfile");
  if(!studentProfile){
    studentProfile = {};
  }
  studentProfile.verified = true;
  studentProfile.school = schoolId;
  studentObj.set("studentProfile",studentProfile);
  await studentObj.save();

  verifyReqObj.set("status", "approved");
  await verifyReqObj.save();

 
  // let school_name = schoolObj.get("name");
  // let channel_id = "" + uid;
  // Parse.Push.send({
  //   channels: [channel_id],
  //   data: {
  //       title: school_name+"已经和您绑定监护关系",
  //       alert: channel_id,
  //   }
  // }, { useMasterKey: true });

  

  return {"code":ErrorCode.SUCCESS, "msg":ErrorCode.SuccessStr};
});

Parse.Cloud.define("rejectStudentVerify", async (request) => {
  // 更新认证单子
  // 向学生推送认证失败消息

  if(!checkUserValid(request)){
    return {"code":ErrorCode.TokenInvalid, "msg":ErrorCode.TokenInvalidMsg};
  }

  let verifyReqId = request.params.verifyReqId;
  const verifyReqQuery = new Parse.Query("verification-request");
  let verifyReqObj = await verifyReqQuery.get(verifyReqId); // 和上面注释中的功能等同
  if(!verifyReqObj){
    return {"code":ErrorCode.VerifyReqNotExist, "msg":ErrorCode.VerifyReqNotExistStr};
  }
  verifyReqObj.set("status", "rejected");
  await verifyReqObj.save();

  

  // let school_name = schoolObj.get("name");
  // let channel_id = "" + uid;
  // Parse.Push.send({
  //   channels: [channel_id],
  //   data: {
  //       title: school_name+"拒绝了您的认证请求",
  //       alert: channel_id,
  //   }
  // }, { useMasterKey: true });

  return {"code":ErrorCode.SUCCESS, "msg":ErrorCode.SuccessStr};
});





// //////////////////////// SCHEMA ///////////////////////////////////
// //////////////////////// ClassName: Account ///////////////////////////////////
// // name: competition name, string
// // role: 0: 普通用户,1:学生, 2:家长， 3:机构/学校,  int
// // userid： 用户id，用来登陆用
// // secret：md5的加密串，用来登陆使用
// // uid:  int32
// // serial_number:   judges array
// // state:  0: 未认证, 1: 认证通过
// // parants: []  数组，监护人
// // children: [] 数组，孩子
// // institutions: [] 机构  account
// // token: 登陆token，string
// // deviceToken: 用来push消息，string
// // mobile_phone: 手机号 string
// // email: 电子邮箱 string
// // wechat: 微信id
// Parse.Cloud.define("ceateAccount", async (request) => {
//   console.dir("enter ceateAccount" );
//   let name = request.params.name;
//   let uid = request.params.uid;
//   let type = request.params.type;
//   let serial_number = request.params.serial_number;
//   if(!name || !uid || !type){
//     return {"code":-1, "msg":"param missing"}
//   }

//   const query = new Parse.Query("Account");
//   query.equalTo("uid", uid);
//   let count = await query.count();
//   if(count>0){
//     return {"code":-2, "msg":"uid already exist"}
//   }

//   let accountObject = new Parse.Object("Account");
//   accountObject.set("name", name);
//   accountObject.set("uid", uid);
//   accountObject.set("type", type);
//   accountObject.set("state", 0);
//   let saveRes = await accountObject.save();
//   console.dir(saveRes);

//   return {"code":0, "msg":"OK", "data":saveRes};
// });


// //////////////////////// SCHEMA ///////////////////////////////////
// //////////////////////// ClassName: VerifyEvents ///////////////////////////////////
// // type:     0:家长和孩子的认证， 1：学生和机构的认证，2：老师和机构的认证
// // uid_to_verify:   要被认证的uid
// // uid_verify:   认证账号的uid
// // state:       0:未认证  1: 认证通过   2: 认证失败
// Parse.Cloud.define("bindGuardian", async (request) => {
//   // 向要绑定的家长推送消息
  
//   if(!checkUserValid(request)){
//     return {"code":ErrorCode.TokenInvalid, "msg":"token invalid, please login first"};
//   }


//   const query = new Parse.Query("VerifyEvents");
//   let uid_to_verify = request.params.uid_to_verify;
//   let uid_verify = request.params.uid_verify;
//   let type = request.params.type;
//   console.dir(request.params);
//   query.equalTo("uid_to_verify", uid_to_verify);
//   query.equalTo("uid_verify", uid_verify);
//   query.equalTo("type", type);
//   let verifyEvents = await query.first();
//   let event_id = "";
//   if(verifyEvents){
//     console.log("111111111111111111111111111111111111111111111111111111111111111");
//     verifyEvents.set("state",0);
//     let saveRes = await verifyEvents.save();
//     event_id = saveRes.id;
//     console.log(event_id);
//   }else{
//     console.log("2222222222222222222222222222222222222222");
//     let verifyEventObj = new Parse.Object("VerifyEvents");
//     verifyEventObj.set("uid_to_verify", uid_to_verify);
//     verifyEventObj.set("uid_verify", uid_verify);
//     verifyEventObj.set("type", type);
//     verifyEventObj.set("state", 0);
//     let saveRes = await verifyEventObj.save();
//     event_id = saveRes.id;
//     console.log(event_id);
//   }

//   let channel_id = "" + uid_verify;

//   Parse.Push.send({
//     channels: [channel_id],
//     data: {
//         title: "请您认证您的孩子",
//         alert: channel_id,
//     }
//   }, { useMasterKey: true });


//   return {"code":0, "msg":"OK", "event_id":event_id};
// });


// Parse.Cloud.define("testpush", async (request) => {
//   Parse.Push.send({
//     channels: ["aaaaaaaaaaaaa"],
//     data: {
//         title: "请您认证您的孩子",
//         alert: "hhhhhhhhhhhhh",
//     }
//   }, { useMasterKey: true });
//   return {"code":0, "msg":"eeeeeeeeeeeeeeeeeee"};
// });

// Parse.Cloud.define("acceptBindGuardian", async (request) => {
//   // 向要绑定的家长推送消息
//   //向家长和孩子都要推送消息（是不是只给孩子推送即可）
//   let objectId = request.params.objectId;
//   const queryEvent = new Parse.Query("VerifyEvents");
//   // queryEvent.equalTo("objectId", objectId);
//   // let verifyEventObj = await queryEvent.first();
//   let verifyEventObj = await queryEvent.get(objectId); // 和上面注释中的功能等同
//   if(!verifyEventObj){
//     return {"code":-1, "msg":"VerifyEvent not exist"};
//   }

//   const query = new Parse.Query("Account");
//   let uid = verifyEventObj.get("uid_to_verify");
//   let guardian_uid = verifyEventObj.get("uid_verify");
//   query.equalTo("uid", guardian_uid);
//   let parantObj = await query.first();
//   if(!parantObj){
//     return {"code":-3, "msg":"guardian_uid not exist in db"};
//   }
//   const query2 = new Parse.Query("Account");
//   query2.equalTo("uid", uid);
//   let childObj = await query2.first();
//   if(!childObj){
//     return {"code":-3, "msg":"child uid not exist in db"};
//   }
//   let parants = childObj.get("parants");
//   if(!parants){
//     parants = [];
//   }
//   let hasBind = false;
//   for (let i = 0; i < parants.length; ++i) {
//     if(parants[i].get("uid")==guardian_uid){
//       hasBind = true;
//       break;
//     }
//   }
//   if(!hasBind){
//     parants.push(parantObj);
//     childObj.set("parants",parants);
//     let saveRes = await childObj.save();
//     console.dir(saveRes);
//   }

//   let children = parantObj.get("children");
//   if(!children){
//     children = [];
//   }
//   let hasBindChild = false;
//   for (let i = 0; i < children.length; ++i) {
//     if(children[i].get("uid")==uid){
//       hasBindChild = true;
//       break;
//     }
//   }

//   if(!hasBindChild){
//     children.push(childObj);
//     parantObj.set("children",children);
//     parantObj.save();
//   }

//   let guardian_name = parantObj.get("name");
//   let channel_id = "" + uid;
//   Parse.Push.send({
//     channels: [channel_id],
//     data: {
//         title: guardian_name+"已经和您绑定监护关系",
//         alert: channel_id,
//     }
//   }, { useMasterKey: true });

//   verifyEventObj.set("state", 1);
//   await verifyEventObj.save();

//   return {"code":0, "msg":"OK"};
// });


// Parse.Cloud.define("rejectBindGuardian", async (request) => {
//   // 向孩子推送消息
//   let objectId = request.params.objectId;
//   const queryEvent = new Parse.Query("VerifyEvents");
//   queryEvent.equalTo("objectId", objectId);
//   let verifyEventObj = await queryEvent.first();
//   if(!verifyEventObj){
//     return {"code":-1, "msg":"VerifyEvent not exist"};
//   }


//   const query = new Parse.Query("Account");
//   let uid = verifyEventObj.get("uid_to_verify");
//   let guardian_uid = verifyEventObj.get("uid_verify");
//   query.equalTo("uid", guardian_uid);
//   let parantObj = await query.first();
//   if(!parantObj){
//     return {"code":-3, "msg":"guardian_uid not exist in db"};
//   }
//   const query2 = new Parse.Query("Account");
//   query2.equalTo("uid", uid);
//   let childObj = await query2.first();
//   if(!childObj){
//     return {"code":-3, "msg":"child uid not exist in db"};
//   }

//   let guardian_name = parantObj.get("name");
//   let channel_id = "" + uid;
//   Parse.Push.send({
//     channels: [channel_id],
//     data: {
//         title: guardian_name+"拒绝了您的绑定请求",
//         alert: channel_id,
//     }
//   }, { useMasterKey: true });

//   verifyEventObj.set("state", 2);
//   await verifyEventObj.save();

//   return {"code":0, "msg":"OK"};
// });

// Parse.Cloud.define("verifyStudent", async (request) => {
//   // 建立认证单子，
//   // 向学校推送消息
//   const query = new Parse.Query("VerifyEvents");
//   let uid_to_verify = request.params.uid_to_verify;
//   let uid_verify = request.params.uid_verify;
//   let type = request.params.type;
//   query.equalTo("uid_to_verify", uid_to_verify);
//   query.equalTo("uid_verify", uid_verify);
//   query.equalTo("type", type);
//   let verifyEvents = await query.first();
//   let event_id = "";
//   if(verifyEvents){
//     verifyEvents.set("state",state);
//     let saveRes = await verifyEvents.save();
//     event_id = saveRes.get("objectId");
//   }else{
//     let verifyEventObj = new Parse.Object("VerifyEvents");
//     verifyEventObj.set("uid_to_verify", uid_to_verify);
//     verifyEventObj.set("uid_verify", uid_verify);
//     verifyEventObj.set("type", type);
//     verifyEventObj.set("state", 0);
//     let saveRes = await verifyEventObj.save();
//     event_id = saveRes.get("objectId");
//   }

//   let channel_id = "" + uid_verify;

//   Parse.Push.send({
//     channels: [channel_id],
//     data: {
//         title: "请您认证此学生",
//         alert: channel_id,
//     }
//   }, { useMasterKey: true });


//   return {"code":0, "msg":"OK", "event_id":event_id};

// });

// Parse.Cloud.define("approveStudentVerify", async (request) => {
//   // 更新认证单子
//   // 向学生推送认证通过消息
//   let objectId = request.params.objectId;
//   const queryEvent = new Parse.Query("VerifyEvents");
//   queryEvent.equalTo("objectId", objectId);
//   let verifyEventObj = await queryEvent.first();
//   if(!verifyEventObj){
//     return {"code":-1, "msg":"VerifyEvent not exist"};
//   }

//   const query = new Parse.Query("Account");
//   let uid = verifyEventObj.get("uid_to_verify");
//   let school_uid = verifyEventObj.get("uid_verify");
//   query.equalTo("uid", school_uid);
//   let schoolObj = await query.first();
//   if(!schoolObj){
//     return {"code":-3, "msg":"school_uid not exist in db"};
//   }
//   const query2 = new Parse.Query("Account");
//   query2.equalTo("uid", uid);
//   let studentObj = await query2.first();
//   if(!studentObj){
//     return {"code":-3, "msg":"student uid not exist in db"};
//   }
//   let institutions = studentObj.get("institutions");
//   if(!institutions){
//     institutions = [];
//   }
//   let hasBind = false;
//   for (let i = 0; i < institutions.length; ++i) {
//     if(institutions[i].get("uid")==guardian_uid){
//       hasBind = true;
//       break;
//     }
//   }
//   if(!hasBind){
//     institutions.push(parantObj);
//     childObj.set("institutions",institutions);
//     let saveRes = await childObj.save();
//     console.dir(saveRes);
//   }
// /*
//   let children = parantObj.get("children");
//   if(!children){
//     children = [];
//   }
//   let hasBindChild = false;
//   for (let i = 0; i < children.length; ++i) {
//     if(children[i].get("uid")==uid){
//       hasBindChild = true;
//       break;
//     }
//   }

//   if(!hasBindChild){
//     children.push(childObj);
//     parantObj.set("children",children);
//     parantObj.save();
//   }
// */
//   let school_name = schoolObj.get("name");
//   let channel_id = "" + uid;
//   Parse.Push.send({
//     channels: [channel_id],
//     data: {
//         title: school_name+"已经和您绑定监护关系",
//         alert: channel_id,
//     }
//   }, { useMasterKey: true });

//   verifyEventObj.set("state", 1);
//   await verifyEventObj.save();

//   return {"code":0, "msg":"OK"};
// });

// Parse.Cloud.define("rejectStudentVerify", async (request) => {
//   // 更新认证单子
//   // 向学生推送认证失败消息

//   let objectId = request.params.objectId;
//   const queryEvent = new Parse.Query("VerifyEvents");
//   queryEvent.equalTo("objectId", objectId);
//   let verifyEventObj = await queryEvent.first();
//   if(!verifyEventObj){
//     return {"code":-1, "msg":"VerifyEvent not exist"};
//   }


//   const query = new Parse.Query("Account");
//   let uid = verifyEventObj.get("uid_to_verify");
//   let school_uid = verifyEventObj.get("uid_verify");
//   query.equalTo("uid", school_uid);
//   let schoolObj = await query.first();
//   if(!schoolObj){
//     return {"code":-3, "msg":"school_uid not exist in db"};
//   }
//   const query2 = new Parse.Query("Account");
//   query2.equalTo("uid", uid);
//   let studentObj = await query2.first();
//   if(!studentObj){
//     return {"code":-3, "msg":"student uid not exist in db"};
//   }

//   let school_name = schoolObj.get("name");
//   let channel_id = "" + uid;
//   Parse.Push.send({
//     channels: [channel_id],
//     data: {
//         title: school_name+"拒绝了您的认证请求",
//         alert: channel_id,
//     }
//   }, { useMasterKey: true });

//   verifyEventObj.set("state", 2);
//   await verifyEventObj.save();

//   return {"code":0, "msg":"OK"};
// });



// Parse.Cloud.define("getAgoraToken", async (request) => {
//   let token = request.params.token;
//   console.log("token=======" + token);
//   // 通过token和比赛id获得用户的uid以及比赛信息
//   let channelName = 'testflutterlf2';
//   let uid = 2882341276;
//   let expirationTimeInSeconds = 7200
//   let currentTimestamp = Math.floor(Date.now() / 1000)
//   let privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds
//   let role = RtcRole.PUBLISHER;
//   let channel_token = RtcTokenBuilder.buildTokenWithUid(configInfo.agora_appid, configInfo.agora_appCertificate, 
//     channelName, uid, role, privilegeExpiredTs);
//   console.log("Token With Integer Number Uid: " + channel_token);
//   return {"channel_token":channel_token};
// });


// // 有效的时间slot
// Parse.Cloud.define("validTimeSlot", async (request) => {
//   return "not ready";
// });


// //////////////////////// SCHEMA ///////////////////////////////////
// // name: competition name, string
// // channel_name: competition name, string
// // type: competition type, int
// // start_time:   Date
// // end_time: Date
// // players:  array for users
// // judges:   judges array
// // state:  0: just construct, 1: judges ready, 2: 审核通过， 3：审核失败，4：支付完成
// Parse.Cloud.define("addCompetition", async (request) => {
//   return "not ready";
// });

// //按照时间先后获取列表
// Parse.Cloud.define("getCompetitionList", async (request) => {
//   return "not ready";
// });

// // 邀请裁判，server同时给裁判发推送
// Parse.Cloud.define("inviteJudge", async (request) => {
//   return "not ready";
// });

// //裁判对邀请的回应
// Parse.Cloud.define("judgeResponseForInvite", async (request) => {
//   return "not ready";
// });

// // 审核结果
// Parse.Cloud.define("applicationResult", async (request) => {
//   return "not ready";
// });


// // 付款结果
// Parse.Cloud.define("paymentForApplication", async (request) => {
//   return "not ready";
// });

// //按照时间先后获取列表
// Parse.Cloud.define("joinCompetition", async (request) => {
//   return "not ready";
// });

// //按照时间先后获取列表
// Parse.Cloud.define("bookCompetition", async (request) => {
//   return "not ready";
// });

// Parse.Cloud.define("cloudCodeTest", async (request) => {
//   return "Hello World";
// });

// Parse.Cloud.define("averageStars", async (request) => {
 
//   let sum = {a:8}
 
//   return sum;
// });