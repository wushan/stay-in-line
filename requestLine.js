const uuidv4 = require('uuid/v4');
const redis = require("redis")
const bluebird = require('bluebird')
bluebird.promisifyAll(redis);
const client = redis.createClient();
// const { promisify } = require('util');
// const { uniq } = require('lodash');
// const getAsync = promisify(client.get).bind(client);
// 非同步取回內容範例
// const res = await getAsync(passport.token)
// console.log(res)
client.on("error", function (err) {
  console.log("Error " + err);
});
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
          return {inline: obj.line.length, inhouse: obj.inhouse.length, checkout: obj.checkOutLine.length, reject: obj.failedCount, served: obj.succeedCount}
        }
        return undefined;
      }
    })
  this.init = () => {
    client.DEL('waitline')
    client.DEL('inhouse')
    client.DEL('counts')
    setInterval(() => {
      this.publishMessage()
    }, 1000)
  }
  this.publishMessage = async () => {
    let waitline = await client.ZCARDAsync('waitline')
    let inhouse = await client.ZCARDAsync('inhouse')
    let fields = await client.HKEYSAsync('counts')
    let counts = []
    if (fields.length > 0) {
      counts = await client.HMGETAsync('counts', fields) 
    }
    let message = {
      waitline: waitline,
      inhouse: inhouse,
      additional: fields.map((a, b) => { return {[a]: counts[b]}} )
    }
    client.PUBLISH('pipe', JSON.stringify(message))
  }
  this.scanAsync = function (cursor, pattern, returnSet) {
    return client.scanAsync(cursor, 'MATCH', pattern, 'COUNT', 10).then((reply) => {
      cursor = reply[0];
      var keys = reply[1];
      keys.forEach(function (key, i) {
        returnSet.add(key);
      })
      if (cursor === '0') {
        return Array.from(returnSet);
      } else {
        return this.scanAsync(cursor, pattern, returnSet)
      }
    })
  }
  this.checkAvailability = async () => {
    let isAvailable = await client.ZCARDAsync('inhouse').then((res) => {
      return res < this.props.seats ? this.props.seats - res : 0
    })
    return isAvailable
  }
  this.getNext = async (available) => {
    let isAvailable = await client.ZRANGEAsync('waitline', '0', available - 1).then((res) => {
      return res
    })
    return isAvailable
  }
  this.getToken = async () => {
    // 如果還能排隊的話 發一張卡
    let lineLenghth = await client.ZCARDAsync('waitline')
    if (lineLenghth <= this.props.lineLimit) {
      let token = uuidv4()
      let passport = {
        token: token,
        created: new Date().getTime()
      }
      // this.props.line.push(passport)
      // Save To Redis
      // client.set('wait-' + passport.token, passport.created, 'EX', this.props.throttle);
      await client.ZADDAsync('waitline', passport.created, passport.token)
      // console.log(token + '產生')
      return passport
    } else {
      // this.props.failedCount = this.props.failedCount + 1
      client.HINCRBYAsync('counts', 'rejected', 1)
      throw Error('wait line is full. current waiting: ' + this.props.line.length)
    }
  }
  this.checkStatus = async (passport) => {
    // client.set('wait-' + passport.token, passport.created, 'EX', this.props.throttle)
    // 已經在店內，可以結帳
    let status = false
    let isInhouse = await client.ZRANKAsync('inhouse', passport.token)
    let isInline = await client.ZRANKAsync('waitline', passport.token)
    if (isInhouse !== null) {
      // console.log(isInhouse)
      // console.log(passport.token + '在店內')
      status = true
    }
    if (isInline !== null) {
      // 再 set 一次，更新 token
      // console.log(passport.token + ' 排隊第' + isInline + '號')
      let updateTime = new Date().getTime()
      await client.ZADDAsync('waitline', updateTime, passport.token)
      status = false
    }
    return status
  }
  this.checkOut = async (passport) => {
    let randomCheckOutWait = Math.floor(Math.random() * 1000)
    await setTimeout(() => {
      client.ZREMAsync('inhouse', passport.token).then(() => {
        client.HINCRBYAsync('counts', 'succeed', 1).then((res) => {
          console.log(res)
        })
      })
    }, randomCheckOutWait)
  }
  this.sync = async (users) => {
    for (let user of users) {
      let inhouseTime = new Date().getTime()
      await client.ZREMAsync('waitline', user)
      await client.ZADDAsync('inhouse', inhouseTime, user)
      // console.log(user + '進店')
    }
  }
  this.worker = async () => {
    // 檢查店內人數，如果店內產生空位，從隊列中的第一個補進來
    try {
      await this.checkAvailability().then((available) => {
        // console.log(available + '個空位')
        if (available > 0) {
          this.getNext(available).then((users) => {
            // console.log(users)
            this.sync(users).then(() => {
              setTimeout(() => {
                this.worker()
              }, 1000);
            })
          })
        } else {
          setTimeout(() => {
            this.worker()
          }, 1000);
        }
      })
    } catch(err) {
      console.log(err)
    }
  }
  this.worker()
}