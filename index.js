const csvWriter = require('csv-write-stream')
const fs = require('fs')
// const memeye = require('memeye');
const Simulator = require('./simulator')
const redis = require("redis")
const client = redis.createClient();
client.on("subscribe", function (channel, count) {
  console.log(channel, count)
})
client.on("message", function (channel, message) {
  console.log("sub channel " + channel + ": " + message);
});
client.SUBSCRIBE('pipe')
// memeye();
var writer = csvWriter()
let simulateAmount = 100
let simulateType = 'wait'
let parallel = 2
let timeGap = 1
Simulator(simulateType, simulateAmount, parallel, timeGap)

// CPU
// const ProcessCPULoad = require('./cpu').ProcessCPULoad;
// const tracker = new ProcessCPULoad();

// tracker.start((total, user, system) => {
//   console.log('CPU Usage: Total: %d, User: %d, System: %d', total, user, system);
// });

// RL.checkStatus()
// writer.pipe(fs.createWriteStream(simulateAmount + '-' + simulateType + '.csv'))
// setInterval(() => {
//   let time = new Date()
//   writer.write(Object.assign(RL.props.monit, { heap: process.memoryUsage().rss / 1024 / 1024, log: time }))
//   // writer.end()
//   // console.log(RL.props.monit)
//   // console.log(process.memoryUsage().rss / 1024 / 1024 + 'MB')
//   console.log(RL.props.line.length, RL.props.inhouse.length, RL.props.checkOutLine.length)
//   if (RL.props.inhouse.length === 0 && RL.props.checkOutLine.length === 0) {
//     process.exit()
//   }
// }, 1000);