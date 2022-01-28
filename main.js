let UUID = require('uuid');
let configInfo = require("./config/config.json");
const RtcTokenBuilder = require('./agora/src/RtcTokenBuilder').RtcTokenBuilder;
const RtcRole = require('./agora/src/RtcTokenBuilder').Role;
const ErrorCode = require('./data/error_code');
let TokenMap = {};
const TOKEN_EXPIRE_TIME = 24*60*60; // 单位秒

Parse.Cloud.beforeSave(Parse.User, async (request) => {
  let uid = request.object.get("uid");
  if(!uid){
    const query = new Parse.Query("Counter");
    let CounterObj = await query.first();
    if(!CounterObj){
      CounterObj = new Parse.Object("Counter");
    }
    CounterObj.increment("counter", 1);
    let counterSaveRes = await CounterObj.save();
    let newCounter = counterSaveRes.get("counter");
    request.object.set("uid",newCounter);
  }
});


Parse.Cloud.define("testinsert", async (request) => {

  let kkk = request.params.kkk;
  let testinsert = new Parse.Object("testinsert");
  testinsert.set("kkk",kkk);
  let saveres = await testinsert.save();
  return {"code":0, "data":saveres};
});

Parse.Cloud.define("testgetarray", async (request) => {

  const engagedTimeQuery = new Parse.Query("testinsert");
  let aaa = ["111","333"];
  engagedTimeQuery.containedIn("kkk",aaa);
  let finds = await engagedTimeQuery.find();
  return {"code":0, "data":finds};
});

Parse.Cloud.define("testgetPointers", async (request) => {
  const connectionQuery = new Parse.Query("connection");
  let aaa = [
    {"__type":"Pointer","className":"_User","objectId":"CJcDX965ng"}
  ];
  connectionQuery.containedIn("to",aaa);
  let connectionObjs = await connectionQuery.find();
  return {"code":0, "datas":connectionObjs};
});

Parse.Cloud.define("getUsers", async (request) => {
  let validUsers = ["A0rhLEKTDi","CJcDX965ng"];
  const UserQuery = new Parse.Query("_User");
  // for(let i =0; i<validUsers.length;i++ ){

  // }
  // queryEvent.equalTo("objectId", objectId);
  UserQuery.containedIn("objectId",validUsers);
  let users = await UserQuery.find();

  return {"code":0, "data":users};
});

Parse.Cloud.define("createDemoData", async (request) => {

  let connectionObj = new Parse.Object("connection");
  var connected = connectionObj.relation("connected");
  const UserQuery = new Parse.Query("_User");
  let users = await UserQuery.find();
  for(let i=0; i<users.length;i++){
    let username = users[i].get("username");
    if(username=="lftest1"){
      let theid = users[i].id;
      let owner = {"__type":"Pointer","className":"_User","objectId":theid};
      connectionObj.set("owner",owner);
      continue;
    }
    connected.add(users[i]);
  }

  await connectionObj.save();


  const workPeriodObj1 = new Parse.Object("workPeriod");
  const workPeriodObj2 = new Parse.Object("workPeriod");
  const workPeriodObj3 = new Parse.Object("workPeriod");
  workPeriodObj1.set("startTime",1000);
  workPeriodObj1.set("endTime",1200);
  workPeriodObj1.set("weekday",2);
  workPeriodObj1.set("user","CJcDX965ng");

  workPeriodObj2.set("startTime",1000);
  workPeriodObj2.set("endTime",1300);
  workPeriodObj2.set("weekday",2);
  workPeriodObj2.set("user","hjQ3k8tNOj");


  workPeriodObj3.set("startTime",1700);
  workPeriodObj3.set("endTime",1800);
  workPeriodObj3.set("weekday",3);
  workPeriodObj3.set("user","S7qyxC7Igj");

  await workPeriodObj1.save();
  await workPeriodObj2.save();
  await workPeriodObj3.save();


  const bookingObj = new Parse.Object("booking");

  let startTime = new Date();
  startTime.setHours(10);
  startTime.setMinutes(0);
  startTime.setSeconds(0);
  startTime.setDate(25);

  let endTime = new Date();
  endTime.setHours(11);
  endTime.setMinutes(0);
  endTime.setSeconds(0);
  endTime.setDate(25);

  bookingObj.set("instructor","hjQ3k8tNOj");
  bookingObj.set("startTime",startTime);
  bookingObj.set("endTime",endTime);

  await bookingObj.save();

  return {"code":0, "msg":"OK"};
  
});


Parse.Cloud.define("createRelations", async (request) => {
  const UserQuery = new Parse.Query("_User");
  let users = await UserQuery.find();
  let uuuObj = new Parse.Object("uuu");
  var relation = uuuObj.relation("relations");
  for(let i = 0; i < users.length; i++){
    relation.add(users[i]);
    break;
  }
  let saveRes = await uuuObj.save();
  return {"code":0, "data":saveRes};
});

Parse.Cloud.define("getRelations", async (request) => {
  const uuuQuery = new Parse.Query("uuu");
  uuuQuery.include("relations");
  let uuuObj = await uuuQuery.first();
  let relations = await uuuObj.get('relations').query().find();
  return {"code":0, "data":relations};
  // var relation = uuuObj.relation("relations");
  // for(let i = 0; i < users.length; i++){
  //   relation.add(users[i]);
  // }
  // let saveRes = await uuuObj.save();
  // return {"code":0, "data":saveRes};
});




Parse.Cloud.define("getConnection", async (request) => {
  const connectionQuery = new Parse.Query("connection");
  connectionQuery.include("from");
  let connectionObjs = await connectionQuery.find();
  for(let i=0;i<connectionObjs.length;i++){
    console.log("111111111111111111111");
    let kkk = connectionObjs[i].get("to").id;
    console.log(kkk);
  }
  return {"code":0, "datas":connectionObjs};
});

Parse.Cloud.define("addConnection", async (request) => {
  console.log("jjjjjjjjjjjjjjjjjjjjj");
  let from = request.params.from;
  let to = request.params.to;

  let fromdata = {"__type":"Pointer","className":"_User","objectId":from};
  let todata = {"__type":"Pointer","className":"_User","objectId":to};

  let connection = new Parse.Object("connection");
  connection.set("from",fromdata);
  connection.set("to",todata);
  let saveres = await connection.save();
  return {"code":0, "data":saveres};
});

Parse.Cloud.define("getIdleJudgesForComp", async (request) => {
  let userObjId = request.params.userObjId;
  let startTime = new Date(request.params.startTime);
  let duration = request.params.duration;

  let endTime = new Date(request.params.startTime);
  let themin =  endTime.getMinutes();
  endTime.setMinutes(themin+duration);

  const connectionQuery = new Parse.Query("connection");
  let ownerCondition = {"__type":"Pointer","className":"_User","objectId":userObjId};
  connectionQuery.equalTo("owner", ownerCondition);
  let connectionObj = await connectionQuery.first();

  
  if(!connectionObj){
    return {"code":0, "data":[]};
  }

  let connections = await connectionObj.get('connected').query().find();
  console.log("kkkkkkkkkkkk connections.length=="+connections.length)
  if(!connections || connections.length==0){
    return {"code":0, "data":[]};
  }

  let day = startTime.getDay();
  let beginHour = startTime.getHours();
  let beginMinute = startTime.getMinutes();
  let startPeriod = beginHour*100 + beginMinute;

  let tempMinutes = duration+beginMinute;
  let endPeriod = beginHour*100 + (tempMinutes/60)*100 + tempMinutes%60;

  let workUsers = [];
  for(let i =0; i<connections.length; i++){
    let wpCondition = {"__type":"Pointer","className":"_User","objectId":connections[i].id};
    workUsers.push(wpCondition);
  }
  const workPeriodQuery = new Parse.Query("workPeriod");
  workPeriodQuery.equalTo("weekday",day);
  workPeriodQuery.lessThanOrEqualTo("startTime",startPeriod);
  workPeriodQuery.greaterThanOrEqualTo("endTime",endPeriod);
  workPeriodQuery.containedIn("user",workUsers);

  let workPeriods = await workPeriodQuery.find();
  console.log("uuuuuuuuuuuu workPeriods.length=="+workPeriods.length)
  if(!workPeriods || workPeriods.length==0){
    return {"code":0, "data":[]};
  }


  const bookingQuery = new Parse.Query("booking");

  let bookingUsers = [];
  for(let i =0; i<workPeriods.length; i++){
    bookingUsers.push(workPeriods[i].get("user"));
  }
  bookingQuery.containedIn("promisee",bookingUsers);


  const bookingQuery1 = new Parse.Query("booking");
  bookingQuery1.greaterThan("startTime",startTime);
  bookingQuery1.lessThan("startTime",endTime);

  const bookingQuery2 = new Parse.Query("booking");
  bookingQuery2.greaterThan("endTime",startTime);
  bookingQuery2.lessThan("endTime",endTime);

  const bookingQuery3 = new Parse.Query("booking");
  bookingQuery3.greaterThanOrEqualTo("endTime",endTime );
  bookingQuery3.lessThanOrEqualTo("startTime",startTime);
  const mainQuery = Parse.Query.and(bookingQuery,Parse.Query.or(bookingQuery1,bookingQuery2,bookingQuery3));
  let bookingObjs = await mainQuery.find();

  console.log("yyyyyyyyyyyyyyyyyyyyy bookingObjs.length=="+bookingObjs.length)


  let validUsers= [];
  for(let i =0; i<workPeriods.length; i++){
    validUsers.push(workPeriods[i].get("user"));
  }

  console.log();

  for(let j=0; j<bookingObjs.length; j++){
    let userid = bookingObjs[j].get("promisee");
    let index = validUsers.indexOf(userid);
    if(index>-1){
      validUsers.splice(index,1);
    }
  }

  const UserQuery = new Parse.Query("_User");
  UserQuery.containedIn("objectId",validUsers);
  let users = await UserQuery.find();

  return {"code":0, "data":users};
  
});

Parse.Cloud.define("getIdleJudges", async (request) => {
/*
  let userId = request.params.userId;
  const userQuery = new Parse.Query("_User");
  let userObj = await userQuery.get(userId);
  if(!userObj){
    return {"code":ErrorCode.UserNotExist, "msg":ErrorCode.UserNotExistStr};
  }

*/

  const connectionQuery = new Parse.Query("connection");
  connectionQuery.equalTo("user", userId);
  let connectionObj = await connectionQuery.first();
  if(!connectionObj){
    return {"code":ErrorCode.ConnectionNotExist, "msg":ErrorCode.ConnectionNotExistStr};
  }

  let startTime = new Date(request.params.startTime);
  let endTime = new Date(request.params.endTime);

  let teachers = connectionObj.get("teachers");

  let weekday = 1;
  const workPeriodQuery = new Parse.Query("work-period");
  workPeriodQuery.containedBy("userId",teachers);
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

  const userQuery = new Parse.Query("user");
  userQuery.containedBy("userid",validUsers);
  let judges = await userQuery.find();
  return {"code":0, "validjudges":judges};
  
 
});






