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
  bookingQuery.equalTo("status","confirmed");

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
  UserQuery.select("username");
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
