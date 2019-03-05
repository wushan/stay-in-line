const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const Simulator = require('./simulator/simulator')
const redis = require("redis")
const redisConfig = require('./config/redis')
const client = redis.createClient(redisConfig)
// var writer = csvWriter()
const jwt = require('jsonwebtoken')
const expressJwt = require("express-jwt");
const { secretKey } = require('./constant/constant');
const jwtAuth = expressJwt({ secret: secretKey }).unless({ path: ["/favicon.ico", "/", "/getToken"] });
app.use(jwtAuth)

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});
app.get('/auth', (req, res) => {
  let token = req.headers.authorization.split('Bearer ')[1]
  jwt.verify(token, secretKey, function (err, decoded) {
    console.log(decoded)
  })
  res.send(200)
})
app.get('/getToken', (req, res) => {
  let token = jwt.sign({
    username: 'TEST',
    createdOn: new Date().getTime()
  }, secretKey, {
    expiresIn: 60 * 60 * 24 // 授权时效24小时
  });
  res.json({token: token});
})
// 當發生連線事件
io.on('connection', (socket) => {
  console.log('Socket Connected');
  client.on("subscribe", function (channel, count) {
    socket.emit('redisConnected', {channel, count})
    // console.log(channel, count)
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
  socket.on("startJob", (config) => {
    console.log(config)
    Simulator(
        config.simulateType, // 模擬類型
        config.simulateAmount, // 模擬次數
        config.parallel, // 併發數
        config.timeGap, // 連線間隔
        config.capacity, // 容量
        config.waitLineLimit, // 排隊量
        config.throttle // 放棄率
      )
  });
  // 當發生離線事件
  socket.on('disconnect', () => {
    console.log('Socket Disconnected');  // 顯示 bye~
  });
});

server.listen(3000, () => {
  console.log("Server Started. http://localhost:3000");
});