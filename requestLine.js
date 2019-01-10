const uuidv4 = require('uuid/v4');
module.exports = function (seats, lineLimit, throttle) {
  this.props = new Proxy({
    machineNo: 0, //發卡機
    lineLimit: lineLimit || 10,
    seats: seats || 100,
    line: [],
    inhouse: [],
    checkOutLine: [],
    houseStarts: 0,
    lineStarts: 0,
    failedCount: 0,
    succeedCount: 0,
    throttle: throttle || 5 // 容許發呆時間
  }, {
      get: function (obj, prop) {
        if (prop in obj) {
          return obj[prop]
        }
        if (prop === 'lineEnds') {
          return obj.lineStarts + obj.lineLimit;
        }
        if (prop === 'monit') {
          return '排隊： ' + obj.line.length + ' 店內： ' + obj.inhouse.length + ' 結帳： ' + obj.checkOutLine.length + ' 無法排隊人數： ' + obj.failedCount + ' 成功人數： ' + obj.succeedCount
        }
        return undefined;
      }
    })
  this.init = () => {}
  this.getToken = async () => {
    // 如果還能排隊的話 發一張卡
    if (this.props.line.length <= this.props.lineLimit) {
      let token = uuidv4()
      let passport = {
        token: token,
        lastSeen: new Date().getTime()
      }
      this.props.line.push(passport)
      return await passport
    } else {
      this.props.failedCount = this.props.failedCount + 1
      throw Error('wait line is full. current waiting: ' + this.props.line.length)
    }
  }
  this.checkStatus = async (token) => {
    //已經在店內，可以結帳
    let status = false
    if (this.props.inhouse.indexOf(token) > -1) {
      status = true
    }
    if (this.props.line.indexOf(token) > -1) {
      // 回傳順位，而不是號碼
      status = false
    }
    return await status
  }
  this.checkOut = async (token) => {
    // let randomUserIndex = Math.floor(Math.random() * this.props.seats)
    // console.log(randomUserIndex + ' 號結帳')
    this.props.checkOutLine.push(token)
    let randomCheckOutWait = Math.floor(Math.random() * 1000)
    await setTimeout(() => {
      this.props.checkOutLine.splice(this.props.checkOutLine.indexOf(token), 1)
      this.props.inhouse.splice(this.props.inhouse.indexOf(token), 1)
      this.props.succeedCount = this.props.succeedCount + 1
    }, randomCheckOutWait)
  }
  // this.cashier = async () => {
  //   let randomUserIndex = Math.floor(Math.random() * this.props.seats)
  //   console.log(randomUserIndex + ' 號結帳')
  //   await this.props.inhouse.splice(randomUserIndex, 1)
  // }
  // let randomCheckOut = Math.floor(Math.random() * 1000)
  // setInterval(() => {
  //   this.cashier()
  // }, randomCheckOut)
  this.worker = async () => {
    // 檢查店內人數，如果店內產生空位，從隊列中的第一個補進來
    if (this.props.inhouse.length < this.props.seats) {
      let needCustomer = this.props.seats - this.props.inhouse.length
      let customers = this.props.line.splice(0, needCustomer)
      for (let customer of customers) {
        this.props.inhouse.push(customer)
      }
    }
    // console.log('排隊中： ' + this.props.line.length)
    // console.log('處理中： ' + this.props.inhouse.length)
  }
  setInterval(() => {
    this.worker()
  }, 1000)
}