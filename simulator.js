const requestLine = require('./requestLine')
const requestDefault = require('./requestDefault')
var faker = require('faker')
let RL = {}
let capacity = 5
let waitLineLimit = 20
let idle = 5
module.exports = function (type, users, parallel, timeGap) {
  this.generateCustomers = async function (amount) {
    for (let i = 0; i < amount; i++) {
      await new Promise(resolve => setTimeout(resolve, timeGap))
      for (let par = 0; par < parallel; par++) {
        let user = new simulate()
      }
    }
  }
  // Simulate
  this.simulate = function () {
    try {
      RL.getToken().then((passport) => {
        // 獲取成功後，每秒問一次現在還要多久
        // console.log(passport)
        checkStatus(passport)
      }).catch((err) => {
        // console.log(err)
      })
    } catch (err) {
      console.log(err)
    }
  }
  this.checkStatus = async function (passport) {
    await setTimeout(() => {
      RL.checkStatus(passport)
        .then((res) => {
          if (res === true) {
            // 已在店內，這邊模擬一點遊戲中的固定壓力
            let fakeUserData = faker.fake("{{lorem.paragraphs}}")
            let eatTime = Math.floor(Math.random() * 1000)
            // console.log('進入店內等待 ' + eatTime + '秒')
            // 0 ~ 100 秒後結帳
            setTimeout(() => {
              RL.checkOut(passport)
            }, eatTime);
          } else {
            setTimeout(() => {
              //詢問中也要產生壓力
              let fakeAskPressure = faker.fake("{{lorem.word}}")
              // console.log(passport.token + ' 詢問中')
              checkStatus(passport)
            }, 2000)
          }
        })
    }, 1000)
  }
  if (type === 'default') {
    RL = new requestDefault(capacity, waitLineLimit, idle) // Capacity, WaitLineLimit, Idle
    RL.init()
    this.generateCustomers(users)
    console.log('容量: ' + capacity + ' 排隊量: ' + waitLineLimit + ' 剔除間隔: ' + idle)
    console.log('模擬同時 ' + parallel + ' 個平行請求，間隔 ' + timeGap + ' 毫秒，共' + users + '次')
  } else {
    RL = new requestLine(capacity, waitLineLimit, idle) // Capacity, WaitLineLimit, Idle
    RL.init()
    this.generateCustomers(users)
    console.log('容量: ' + capacity + ' 排隊量: ' + waitLineLimit + ' 剔除間隔: ' + idle)
    console.log('模擬同時 ' + parallel + ' 個平行請求，間隔 ' + timeGap + ' 毫秒，共' + users + '次')
  }
}