const axios = require('axios')
const uuidv4 = require('uuid/v4')
const redis = require("redis")
const jwt = require('jsonwebtoken')
const { secretKey } = require('../constant/constant');
const bluebird = require('bluebird')
const redisConfig = require('../config/redis')
bluebird.promisifyAll(redis)
const client = redis.createClient()
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
    throttle: throttle || 1 // 放棄率
  }, {
      get: function (obj, prop) {
        if (prop in obj) {
          return obj[prop]
        }
        if (prop === 'lineEnds') {
          return obj.lineStarts + obj.lineLimit;
        }
        if (prop === 'monit') {
          return { inline: obj.line.length, inhouse: obj.inhouse.length, checkout: obj.checkOutLine.length, reject: obj.failedCount, served: obj.succeedCount }
        }
        return undefined;
      }
    })
  this.init = () => {
    client.DEL('waitline')
    client.DEL('inhouse')
    client.DEL('counts')
    setTimeout(() => {
      let startTime = new Date().getTime()
      this.publishMessage(startTime)
    }, 100);
  }
  this.publishMessage = async (startTime) => {
    try {
      let currentTime = new Date().getTime()
      let waitline = await client.ZCARDAsync('waitline')
      let inhouse = await client.ZCARDAsync('inhouse')
      let fields = await client.HKEYSAsync('counts')
      let counts = []
      if (fields.length > 0) {
        counts = await client.HMGETAsync('counts', fields)
      }
      let message = {
        timepassed: (currentTime - startTime) / 1000,
        waitline: waitline,
        inhouse: inhouse,
        additional: fields.map((a, b) => { return { [a]: counts[b] } })
      }
      // if (waitline > 0 || inhouse > 0) {
      //   let testTime = new Date().getTime()
      //   console.log('耗時：' + (testTime - currentTime) / 1000)
      //   client.PUBLISH('pipe', JSON.stringify(message))
      //   setTimeout(() => {
      //     this.publishMessage(startTime)
      //   }, 1000);
      // } else {
      //   client.PUBLISH('pipe', JSON.stringify(message))
      //   client.PUBLISH('pipe', 'pipeDone')
      // }
      let testTime = new Date().getTime()
      console.log('耗時：' + (testTime - currentTime) / 1000)
      client.PUBLISH('pipe', JSON.stringify(message))
      setTimeout(() => {
        this.publishMessage(startTime)
      }, 1000);
    } catch (err) {
      console.log(err)
    }
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
  this.resolveJWT = (token) => {
    let resolved = jwt.verify(token, secretKey)
    return resolved
  }
  this.signJWT = (name) => {
    return jwt.sign({
      username: name,
      createdOn: new Date().getTime()
    }, secretKey, {
      expiresIn: 60 * 60 * 24 // 授权时效24小时
    })
  }
  this.getToken = async (name) => {
    // 如果還能排隊的話 發一張卡
    let lineLenghth = await client.ZCARDAsync('waitline')
    if (lineLenghth <= this.props.lineLimit) {
      // JWT
      let token = this.signJWT(name)
      let passport = {
        token: token,
        created: new Date().getTime()
      }
      await client.ZADDAsync('waitline', passport.created, passport.token)
      return passport
    } else {
      client.HINCRBYAsync('counts', 'rejected', 1)
      throw Error('wait line is full. current waiting: ' + this.props.line.length)
    }
  }
  this.checkStatus = async (passport) => {
    // 已經在店內，可以結帳
    let status = false
    let isInhouse = await client.ZRANKAsync('inhouse', passport.token)
    let isInline = await client.ZRANKAsync('waitline', passport.token)
    if (isInhouse !== null) {
      status = true
    }
    if (isInline !== null) {
      // 再 set 一次，更新 token
      // console.log(passport.token + ' 排隊第' + isInline + '號')
      if (Math.round(Math.random() * 100) === throttle) {
        // 放棄排隊百分比
        await client.HINCRBYAsync('counts', 'giveup', 1)
        await client.ZREMAsync('waitline', passport.token)
        console.log('有人放棄')
        status = false
      } else {
        let updateTime = new Date().getTime()
        await client.ZADDAsync('waitline', updateTime, passport.token)
        status = false
      }
    }
    return status
  }
  this.checkOut = async (passport) => {
    let randomCheckOutWait = Math.floor(Math.random() * 1000)
    await setTimeout(() => {
      client.ZREMAsync('inhouse', passport.token).then(() => {
        client.HINCRBYAsync('counts', 'succeed', 1)
      })
    }, randomCheckOutWait)
  }
  this.sync = async (users) => {
    for (let user of users) {
      let inhouseTime = Math.round(new Date().getTime() / 1000)
      await client.ZREMAsync('waitline', user)
      let resolved = this.resolveJWT(user)
      await client.HSETAsync('counts', 'lastWait', (inhouseTime - resolved.iat))
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
    } catch (err) {
      console.log(err)
    }
  }
  this.worker()
}
