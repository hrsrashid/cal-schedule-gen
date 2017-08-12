function doGet() {
  return HtmlService
    .createTemplateFromFile('index')
    .evaluate();
}

function include(filename) {
  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();
}

function saveState(state) {
  var props = {};
  
  for (var i in state) {
    props[i] = JSON.stringify(state[i]);
  }
  
  PropertiesService
    .getUserProperties()
    .setProperties(props);
}

function loadState() {
  var props = PropertiesService
    .getUserProperties()
    .getProperties();
  
  var state = {};
  
  for (var i in props) {
    state[i] = JSON.parse(props[i]);
  }
  
  return state;
}

function saveSchedule(id, start, end, startWeek, schedule) {
  var cal = getCalendar(id);
  var termStart = getDate(start, 0, true);
  
  iterate(schedule, function(day, time, subjects) {
    var startTime = moveToDay(getDay(day), getDate(termStart, time, true));
    var endTime = getDate(end, time, true);
    var subjs = getSubject(subjects, day, startTime, startWeek, endTime, termStart);
    
    subjs.map(function(subj) {
      cal.createEventSeries(
        subj.name,
        subj.startTime,
        getDate(subj.startTime, min(90)),
        subj.recurrence, {
          location: subj.location
        }
      );
    });
  });
}

function moveToDay(day, date) {
  return getDate(date, (day - date.getDay()) * hour(24));
}

function getCalendar(id) {
  const CALENDAR_NAME = 'Term schedule ('+id+')';
  var cal = CalendarApp.getCalendarsByName(CALENDAR_NAME);
  
  if (cal.length == 0) {
    cal = CalendarApp.createCalendar(CALENDAR_NAME, {
      summary: "Automaticly generated calendar from schedule app",
      color: CalendarApp.Color.RED
    });
  } else {
    cal = cal.pop();
  }
  
  return cal;
}

function getDate(date, time, resetTime) {
  var date = new Date(date);
  
  if (resetTime) {
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
  }
  
  return new Date(date.getTime() + toMilliseconds(time));
}

function toMilliseconds(time) {
  return ({
    '8:00': hour(8),
    '9:40': hour(9) + min(40),
    '11:30': hour(11) + min(30),
    '13:10': hour(13) + min(10),
    '15:00': hour(15),
    '16:40': hour(16) + min(40)
  })[time] || time;
}

function hour(k) {
  return k * min(60);
}

function min(k) {
  return k * 60 * 1000;
}

function iterate(schedule, cb) {
  for (var day in schedule) {
    var byTime = schedule[day];
    
    for (var time in byTime) {
      var subjects = byTime[time];
      
      cb(day, time, subjects);
    }
  }
}

function delEventSeries(cal, eid) {
  var event = cal.getEventSeriesById(eid);
  
  if (event) {
    event.deleteEventSeries();
  }
}

function getEventId(day, time) {
  return ("" + day + time).replace(/\W/g, '_');
}

function getSubject(subjs, day, startTime, startWeek, endTime, termStart) {
  var res = [];
  
  if (subjs.split) {
    if (subjs.high) {
      res.push({
        name: subjs.high,
        location: subjs.high_location,
        startTime: startWithOffset('high', startWeek, startTime),
        recurrence: createWeeklyRecurrence(day, termStart, endTime)
          .interval(2)
      });
    }
    
    if (subjs.low) {
      res.push({
        name: subjs.low,
        location: subjs.low_location,
        startTime: startWithOffset('low', startWeek, startTime),
        recurrence: createWeeklyRecurrence(day, termStart, endTime)
          .interval(2)
      });
    }
  } else {
    if (subjs.every) {
      res.push({
        name: subjs.every,
        location: subjs.every_location,
        startTime: startTime,
        recurrence: createWeeklyRecurrence(day, termStart, endTime)
      });
    }
  }
  
  return res;
}

function startWithOffset(week, startWeek, time) {
  if (week == startWeek) {
    return time;
  }
  
  return getDate(time, 7 * hour(24));
}

function createWeeklyRecurrence(day, termStart, endTime) {
  return CalendarApp.newRecurrence()
    .addDailyExclusion()
    .until(termStart)
    .addWeeklyRule()
    .weekStartsOn(CalendarApp.Weekday.MONDAY)
    .onlyOnWeekday(getWeekday(day))
    .until(endTime);
}

function getWeekday(day) {
  return ({
    'Monday': CalendarApp.Weekday.MONDAY,
    'Tuesday': CalendarApp.Weekday.TUESDAY,
    'Wednesday': CalendarApp.Weekday.WEDNESDAY,
    'Thursday': CalendarApp.Weekday.THURSDAY,
    'Friday': CalendarApp.Weekday.FRIDAY,
    'Saturday': CalendarApp.Weekday.SATURDAY
  })[day];
}

function getDay(day) {
  return ({
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  })[day];
}