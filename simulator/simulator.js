const requestLine = require('../runner/queueRunner')
// const requestDefault = require('../requestDefault')
var faker = require('faker')
let RL = {}
module.exports = function (type, users, parallel, timeGap, capacity, waitLineLimit, throttle) {
  // console.log(type, users, parallel, timeGap, capacity, waitLineLimit, throttle)
  this.generateCustomers = async function (amount) {
    console.log(amount)
    for (let i = 0; i < amount; i++) {
      // console.log(i)
      await new Promise(resolve => setTimeout(resolve, timeGap))
      for (let par = 0; par < parallel; par++) {
        let user = new simulate()
        // console.log(i + '-' + par)
      }
    }
  }
  // Simulate
  this.simulate = function () {
    try {
      RL.getToken(faker.fake("{{name.lastName}}")).then((passport) => {
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
            setTimeout(() => {
              RL.checkOut(passport)
            }, eatTime);
          } else {
            setTimeout(() => {
              let fakeAskPressure = faker.fake("{{lorem.word}}")
              checkStatus(passport)
            }, 2000)
          }
        })
    }, 1000)
  }
  if (type === 'default') {
    RL = new requestDefault(capacity, waitLineLimit, throttle) // Capacity, WaitLineLimit, throttle
    RL.init()
    this.generateCustomers(users)
    console.log('容量: ' + capacity + ' 排隊量: ' + waitLineLimit + ' 放棄率: ' + throttle + '%')
    console.log('模擬同時 ' + parallel + ' 個平行請求，間隔 ' + timeGap + ' 毫秒，共' + users + '次')
  } else {
    RL = new requestLine(capacity, waitLineLimit, throttle) // Capacity, WaitLineLimit, throttle
    RL.init()
    this.generateCustomers(users)
    console.log('容量: ' + capacity + ' 排隊量: ' + waitLineLimit + ' 放棄率: ' + throttle + '%')
    console.log('模擬同時 ' + parallel + ' 個平行請求，間隔 ' + timeGap + ' 毫秒，共' + users + '次')
  }
}