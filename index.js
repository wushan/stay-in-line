const requestLine = require('./requestLine')
// const { send } = require('micro')

let RL = new requestLine(100, 50, 5)
RL.init()
setInterval(() => {
  let rnd = Math.floor(Math.random() * 100)
  // console.log(rnd + '位客人')
  for (let i = 0; i < rnd; i++) {
    let user = new Simulate()
  }
}, 500);
// Simulate
function Simulate () {
  try {
    RL.getToken().then((pass) => {
      // console.log('獲得 ' + pass.token + ' 號')
      // 獲取成功後，每秒問一次現在還要多久
      checkStatus(pass)
    }).catch((err) => {
      // console.log(err)
    })
  } catch (err) {
    console.log(err)
  }
}
function checkStatus(pass) {
  RL.checkStatus(pass).then((res) => {
    if (res === true) {
      // console.log(pass.token + ' 去結帳')
      let eatTime = Math.floor(Math.random() * 10000)
      setTimeout(() => {
        RL.checkOut(pass)
      }, eatTime);
    } else {
      setTimeout(() => {
        checkStatus(pass)
      }, 1000)
    }
  }).catch((err) => {
    console.log(err)
  })
}
// RL.checkStatus()
setInterval(() => {
  console.log(RL.props.monit)
}, 1000);