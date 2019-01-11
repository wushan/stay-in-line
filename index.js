const csvWriter = require('csv-write-stream')
const fs = require('fs')
const requestLine = require('./requestLine')
const requestDefault = require('./requestDefault')
// var cpuNums = require('os').cpus().length
// console.log(cpuNums)
const memeye = require('memeye');
memeye();
var faker = require('faker')
var writer = csvWriter()
// const { send } = require('micro')
let simulateAmount = 100000
let simulateType = 'default'
let RL = {}
startSimulate(simulateType, simulateAmount)
function startSimulate (type, users) {
  if (type === 'default') {
    RL = new requestDefault(14000, 5000, 5) // Capacity, WaitLineLimit, Idle
    RL.init()
    generateCustomers(users)
  } else {
    RL = new requestLine(14000, 14000, 5) // Capacity, WaitLineLimit, Idle
    RL.init()
    generateCustomers(users)
  }
}
async function generateCustomers(amount) {
  for (let i = 0; i < amount; i++) {
    // console.log((amount - i) + ' / ' + amount)
    await new Promise(resolve => setTimeout(resolve, 1))
    for (let par = 0; par < 10; par++) {
      let user = new Simulate()
    }
  }
}
// Simulate
function Simulate() {
  try {
    RL.getToken().then((pass) => {
      // 獲取成功後，每秒問一次現在還要多久
      checkStatus(pass)
    }).catch((err) => {
      // console.log(err)
    })
  } catch (err) {
    console.log(err)
  }
}
async function checkStatus(pass) {
  await RL.checkStatus(pass)
  .then((res) => {
    if (res === true) {
      // 已在店內，這邊模擬一點遊戲中的固定壓力
      let fakeUserData = faker.fake("{{lorem.paragraphs}}")
      let eatTime = Math.floor(Math.random() * 100000)
      // 0 ~ 100 秒後結帳
      setTimeout(() => {
        RL.checkOut(pass)
      }, eatTime);
    } else {
      setTimeout(() => {
        //詢問中也要產生壓力
        let fakeAskPressure = faker.fake("{{lorem.word}}")
        checkStatus(pass)
      }, 1000)
    }
  })
}


// CPU
const ProcessCPULoad = require('./cpu').ProcessCPULoad;
const tracker = new ProcessCPULoad();

tracker.start((total, user, system) => {
  console.log('CPU Usage: Total: %d, User: %d, System: %d', total, user, system);
});

// RL.checkStatus()
writer.pipe(fs.createWriteStream(simulateAmount + '-' + simulateType + '.csv'))
setInterval(() => {
  let time = new Date()
  writer.write(Object.assign(RL.props.monit, { heap: process.memoryUsage().rss / 1024 / 1024, log: time }))
  // writer.end()
  // console.log(RL.props.monit)
  // console.log(process.memoryUsage().rss / 1024 / 1024 + 'MB')
  console.log(RL.props.line.length, RL.props.inhouse.length, RL.props.checkOutLine.length)
  if (RL.props.inhouse.length === 0 && RL.props.checkOutLine.length === 0) {
    process.exit()
  }
}, 1000);