let UUID = require('uuid');
let configInfo = require("./config/config.json");
const RtcTokenBuilder = require('./agora/src/RtcTokenBuilder').RtcTokenBuilder;
const RtcRole = require('./agora/src/RtcTokenBuilder').Role;
const ErrorCode = require('./data/error_code');
let TokenMap = {};
const TOKEN_EXPIRE_TIME = 24*60*60; // 单位秒
function minutesToString(minutes) {


  let hours = parseInt(minutes/60);
  let min = minutes%60;

  let hoursStr = hours+"";
  if(hours<10){
    hoursStr = "0" + hoursStr;
  }
  let minStr = min+"";
  if(min<10){
    minStr = "0" + minStr;
  }

  return hoursStr+minStr;
  
}
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


Parse.Cloud.beforeSave("booking", async (request) => {

console.log("beforeSave booking");
  let status = request.object.get("status");
  if(status!="confirmed"){
    return;
  }
  let startTime = request.object.get("startTime");
  let endTime = request.object.get("endTime");

  if(!startTime || !endTime){
    return;
  }

  let provider = request.object.get("provider");

  const bookingQuery = new Parse.Query("booking");
  bookingQuery.equalTo("provider",provider);

  const bookingQuery1 = new Parse.Query("booking");
  bookingQuery1.greaterThan("startTime",startTime);
  bookingQuery1.lessThan("startTime",endTime);

  const bookingQuery2 = new Parse.Query("booking");
  bookingQuery2.greaterThan("endTime",startTime);
  bookingQuery2.lessThan("endTime",endTime);

  const bookingQuery3 = new Parse.Query("booking");
  bookingQuery3.lessThanOrEqualTo("startTime",startTime);
  bookingQuery3.greaterThanOrEqualTo("endTime",endTime);

  const mainQuery = Parse.Query.and(bookingQuery,Parse.Query.or(bookingQuery1,bookingQuery2,bookingQuery3));
  let bookingObjs = await mainQuery.find();
  console.log("beforeSave bookingObjs.length==="+bookingObjs.length);
  if(bookingObjs.length==0){
    return;
  }
  if(bookingObjs.length==1 && bookingObjs[0].id==request.object.id){
    console.log("beforeSave bookingObjs[0].id==="+bookingObjs[0].id + "  request.object.id==="+request.object.id);
    return;
  }
  
  throw 'booking time conflict';
  

 
});



Parse.Cloud.define("getIdleUsers", async (request) => {
  let userObjId = request.params.userId;
  let startTime = new Date(request.params.startTime);
  let endTime = new Date(request.params.endTime);
  // let duration = request.params.duration;

  // let endTime = new Date(request.params.startTime);
  // let themin =  endTime.getMinutes();
  // endTime.setMinutes(themin+duration);


  let day = startTime.getDay();
  let beginHour = startTime.getHours();
  let beginMinute = startTime.getMinutes();
  let startPeriod = beginHour*100 + beginMinute;

  let endHour = endTime.getHours();
  let endMinute = endTime.getMinutes();
  let endPeriod = endHour*100 + endMinute;

  // let tempMinutes = duration+beginMinute;
  // let endPeriod = beginHour*100 + (tempMinutes/60)*100 + tempMinutes%60;


  let workUsers = [];

  if(userObjId){
    const connectionQuery = new Parse.Query("connection");
    let ownerCondition = {"__type":"Pointer","className":"_User","objectId":userObjId};
    connectionQuery.equalTo("owner", ownerCondition);
    let connectionObj = await connectionQuery.first();

    
    if(!connectionObj){
      return {"code":0, "data":[]};
    }

    let connections = await connectionObj.get('connected').query().find();
    console.log("getIdleUsers connections.length=="+connections.length)
    if(!connections || connections.length==0){
      return {"code":0, "data":[]};
    }

    
    for(let i =0; i<connections.length; i++){
      let wpCondition = {"__type":"Pointer","className":"_User","objectId":connections[i].id};
      workUsers.push(wpCondition);
    }
  }

  

 

  
  const workPeriodQuery = new Parse.Query("workPeriod");
  workPeriodQuery.equalTo("weekday",day);
  workPeriodQuery.lessThanOrEqualTo("startTime",startPeriod);
  workPeriodQuery.greaterThanOrEqualTo("endTime",endPeriod);
  if(userObjId){
    workPeriodQuery.containedIn("user",workUsers);
  }

  let workPeriods = await workPeriodQuery.find();
  console.log("getIdleUsers workPeriods.length=="+workPeriods.length)
  if(!workPeriods || workPeriods.length==0){
    return {"code":0, "data":[]};
  }


  const bookingQuery = new Parse.Query("booking");

  let bookingUsers = [];
  for(let i =0; i<workPeriods.length; i++){
    bookingUsers.push(workPeriods[i].get("user"));
  }
  bookingQuery.containedIn("provider",bookingUsers);


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

  console.log("getIdleUsers bookingObjs.length=="+bookingObjs.length)


  let validUsers= [];
  for(let i =0; i<workPeriods.length; i++){
    let theid = workPeriods[i].get("user").id;
    if(validUsers.indexOf(theid)<0){
      validUsers.push(theid);
    }
   
  }

  console.log("getIdleUsers validUsers.length==" + validUsers.length);

  for(let j=0; j<bookingObjs.length; j++){
    let userid = bookingObjs[j].get("provider").id;
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


Parse.Cloud.define("getUserValidTime", async (request) => {
  let userObjId = request.params.userId;
  let year = request.params.year;
  let month = request.params.month;


  let curDate = new Date();

  let startTime = new Date(year,month-1,1);
  let endTime= new Date(year,month,1);

  const workPeriodQuery = new Parse.Query("workPeriod");
  // workPeriodQuery.equalTo("weekday",day);
  // workPeriodQuery.lessThanOrEqualTo("startTime",startPeriod);
  // workPeriodQuery.greaterThanOrEqualTo("endTime",endPeriod);
  let usercondition = {"__type":"Pointer","className":"_User","objectId":userObjId};
  workPeriodQuery.equalTo("user",usercondition);
  //query.descending("weekday")
  workPeriodQuery.ascending("weekday");
  workPeriodQuery.ascending("startTime");
  
  let workPeriods = await workPeriodQuery.find();
  let validUserTimes = {};
  for(let i = 0; i<workPeriods.length;i++){
    let workPeriod = workPeriods[i];
    let wpStartTime = workPeriod.get("startTime");
    let wpEndTime = workPeriod.get("endTime");
    let weekday = workPeriod.get("weekday");
    
    let myBegin = new Date(year,month-1,1);
    let beginDay = myBegin.getDay();
    let dis = weekday-beginDay;
    if(dis<0){
      dis = dis+7;
    }

    

    while(true){
      let tempDatetime = new Date(year,month-1,1);
      let tempDate = tempDatetime.getDate();
      let newDate = tempDate + dis;
      dis = dis + 7;
      tempDatetime.setDate(newDate);

      let beginTime = new Date(tempDatetime.getTime());
      let beginHour = parseInt(wpStartTime/100);
      let beginMin = wpStartTime%100;
      beginTime.setHours(beginHour);
      beginTime.setMinutes(beginMin);
      let finishTime = new Date(tempDatetime.getTime());
      let finishHour = parseInt(wpEndTime/100);
      let finishMin = wpEndTime%100;
      finishTime.setHours(finishHour);
      finishTime.setMinutes(finishMin);

      if(beginTime<curDate||finishTime<curDate){
        continue;
      }

      if(beginTime>endTime||finishTime>endTime){
        break;
      }

      let date = tempDatetime.getDate();
      if(validUserTimes[date]==undefined){
        validUserTimes[date] = [];
      }

      let beginIndex = beginHour*60 + beginMin;
      let endIndex = finishHour*60 + finishMin;
      for(let i = beginIndex; i < endIndex+1; i++ ){
        if(validUserTimes[date].indexOf(i)<0){
          validUserTimes[date].push(i);
        }
      }
    }

  }


  const bookingQuery1 = new Parse.Query("booking");
  bookingQuery1.greaterThanOrEqualTo("startTime",startTime);
  bookingQuery1.lessThanOrEqualTo("startTime",endTime);

  const bookingQuery2 = new Parse.Query("booking");
  bookingQuery2.greaterThanOrEqualTo("endTime",startTime);
  bookingQuery2.lessThanOrEqualTo("endTime",endTime);

  const mainQuery = Parse.Query.or(bookingQuery1,bookingQuery2)
  mainQuery.equalTo("provider",usercondition);
  mainQuery.equalTo("status","confirmed");
  mainQuery.ascending("startTime");
  let bookingObjs = await mainQuery.find();
  console.log("bookingObjs.length===="+bookingObjs.length);
  for(let j = 0; j<bookingObjs.length;j++){
    let bookingObj = bookingObjs[j];
    let dateTime = bookingObj.get("startTime");
    let endTime = bookingObj.get("endTime");
    let endHours = endTime.getHours();
    let endMin = endTime.getMinutes();
    let startHours = dateTime.getHours();
    let startMin = dateTime.getMinutes();
    let duration = (endHours-startHours)*60+(endMin-startMin)
    //let duration = bookingObj.get("duration");

    let date = dateTime.getDate();
    let hour =  dateTime.getHours();
    let minute =  dateTime.getMinutes();
    if(validUserTimes[date]==undefined){
      continue;
    }
    let beginIndex = hour*60+minute;
    console.log("uwuwuwuwuuuwu beginIndex=="+beginIndex + " duration=="+duration);
    for(let z=beginIndex+1; z<beginIndex+duration; z++){
      let theIndex = validUserTimes[date].indexOf(z)
      if(theIndex>-1){
        validUserTimes[date].splice(theIndex,1);;
      }
    }
  }

  let sortedValidUserTimes = {};
  for(var key in validUserTimes){
    validUserTimes[key].sort();
    let afterArray = [];
    let theLen = validUserTimes[key].length;
    if(theLen==0||theLen==1){
      continue;
    }
    for(let k = 0; k < theLen; k++){
      if(k==0 &&  (validUserTimes[key][1]-validUserTimes[0] > 1)){
       continue;
      } else if(k==theLen-1 &&  (validUserTimes[key][theLen-1]-validUserTimes[theLen-2] > 1)){
        continue;
      } else if((validUserTimes[key][k]-validUserTimes[k-1] > 1)&&(validUserTimes[key][k+1]-validUserTimes[k1] > 1)){
        continue;
      }
      afterArray.push(validUserTimes[key][k]);
    }

    if(afterArray.length==0||afterArray.length==1){
      continue;
    }
    sortedValidUserTimes[key] = afterArray;

  }

  let finalValidUserTimes = [];
  for(let dateIndex=1; dateIndex<32; dateIndex++){
    if(sortedValidUserTimes[dateIndex]==undefined){
      continue;
    }
    console.log("pppppppppppppppppppppp");
    console.log(sortedValidUserTimes[dateIndex].toString());
    let theLen = sortedValidUserTimes[dateIndex].length;
    let monthStr = month+"";
    if(month<10){
      monthStr = "0" + monthStr;
    }
    let dateStr = dateIndex+"";
    if(dateIndex<10){
      dateStr = "0" + dateStr;
    }
    let preFix = year+"" + monthStr + dateStr;
    let beginTime;
    let endTime;
    for(let i=0; i<theLen;i++){
      if(i==0){
        beginTime = sortedValidUserTimes[dateIndex][i];
      }else if(i==theLen-1){
        endTime = sortedValidUserTimes[dateIndex][i];
        console.log("111111111111111111");
        console.dir(beginTime);
        console.dir(endTime);
        var temp = {"start":preFix+minutesToString(beginTime), "end":preFix+minutesToString(endTime)};
        finalValidUserTimes.push(temp);
        

      }else if(sortedValidUserTimes[dateIndex][i+1]-sortedValidUserTimes[dateIndex][i]>1){
        endTime = sortedValidUserTimes[dateIndex][i];
        console.log("222222222222222");
        console.dir(beginTime);
        console.dir(endTime);
        var temp = {"start":preFix+minutesToString(beginTime), "end":preFix+minutesToString(endTime)};
        finalValidUserTimes.push(temp);
        beginTime = sortedValidUserTimes[dateIndex][i+1];
      }
    }
  }
  
  
  return {"code":0, "userId": userObjId, "data":finalValidUserTimes};

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



// Parse.Cloud.define("getIdleJudges", async (request) => {
// /*
//   let userId = request.params.userId;
//   const userQuery = new Parse.Query("_User");
//   let userObj = await userQuery.get(userId);
//   if(!userObj){
//     return {"code":ErrorCode.UserNotExist, "msg":ErrorCode.UserNotExistStr};
//   }

// */

//   const connectionQuery = new Parse.Query("connection");
//   connectionQuery.equalTo("user", userId);
//   let connectionObj = await connectionQuery.first();
//   if(!connectionObj){
//     return {"code":ErrorCode.ConnectionNotExist, "msg":ErrorCode.ConnectionNotExistStr};
//   }

//   let startTime = new Date(request.params.startTime);
//   let endTime = new Date(request.params.endTime);

//   let teachers = connectionObj.get("teachers");

//   let weekday = 1;
//   const workPeriodQuery = new Parse.Query("work-period");
//   workPeriodQuery.containedBy("userId",teachers);
//   workPeriodQuery.equalTo("weekday",weekday);
//   workPeriodQuery.lessThanOrEqualTo("startTime",startTime );
//   workPeriodQuery.greaterThanOrEqualTo("endTime",endTime);
//   let workPeriodsObjs = await workPeriodQuery.find();
//   let validUsers = [];
//   for(let i=0; i<workPeriodsObjs.length; i++){
//     validUsers.push(workPeriodsObjs[i].get("userid"));
//   }

//   const engagedTimeQuery = new Parse.Query("engaged-time");
//   engagedTimeQuery.containedBy("userid",validUsers);

//   const engagedTimeQuery1 = new Parse.Query("engaged-time");
//   engagedTimeQuery1.greaterThan("startTime",startTime);
//   engagedTimeQuery1.lessThan("startTime",endTime);

//   const engagedTimeQuery2 = new Parse.Query("engaged-time");
//   engagedTimeQuery2.greaterThan("endTime",startTime);
//   engagedTimeQuery2.lessThan("endTime",endTime);

//   const engagedTimeQuery3 = new Parse.Query("engaged-time");
//   engagedTimeQuery3.greaterThanOrEqualTo("endTime",endTime );
//   engagedTimeQuery3.lessThanOrEqualTo("startTime",startTime);
//   const mainQuery = Parse.Query.and(engagedTimeQuery,Parse.Query.or(engagedTimeQuery1,engagedTimeQuery2,engagedTimeQuery3));
//   let engagedTimeObjs = await mainQuery.find();
//   for(let j=0; j<engagedTimeObjs.length; j++){
//     let userid = engagedTimeObjs[j].get("userid");
//     let index = validUsers.indexOf(userid);
//     if(index>-1){
//       validUsers.splice(index,1);
//     }
//   }

//   const userQuery = new Parse.Query("user");
//   userQuery.containedBy("userid",validUsers);
//   let judges = await userQuery.find();
//   return {"code":0, "validjudges":judges};
  
 
// });






