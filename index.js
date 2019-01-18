const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const csvWriter = require('csv-write-stream')
const fs = require('fs')
// const memeye = require('memeye');
const Simulator = require('./simulator')
const redis = require("redis")
const client = redis.createClient();
// memeye();
var writer = csvWriter()
let simulateAmount = 100
let simulateType = 'wait'
let parallel = 2
let timeGap = 1
// Simulator(simulateType, simulateAmount, parallel, timeGap)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});
// app.post('/start', (req, res) => {
//   Simulator(simulateType, simulateAmount, parallel, timeGap)
//   res.send(200)
// })

// 當發生連線事件
io.on('connection', (socket) => {
  console.log('Connected');  // 顯示 Hello!
  client.on("subscribe", function (channel, count) {
    console.log(channel, count)
  })
  client.on("message", function (channel, message) {
    console.log("sub channel " + channel + ": " + message);
    if (message === 'pipeDone') {
      socket.emit("pipeDone", message);
    } else {
      socket.emit("pipeEvent", message);
    }
  });
  client.SUBSCRIBE('pipe')
  socket.on("startJob", () => {
    Simulator(simulateType, simulateAmount, parallel, timeGap)
  });
  // 當發生離線事件
  socket.on('disconnect', () => {
    console.log('Bye~');  // 顯示 bye~
  });
});

// 注意，這邊的 server 原本是 app
server.listen(3000, () => {
  console.log("Server Started. http://localhost:3000");
});
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