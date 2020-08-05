const events = require('events')
const eventEmitter = new events.EventEmitter()

const status = {
    link: undefined,
    armed: undefined,
    abort: undefined,
    intruder: undefined,
    panic: undefined,
    autoArm: undefined,
    autoDisarm: undefined,
    autoDays: [false, false, false, false, false, false, false],
    airQuality: undefined
}

const update = (prop, newState) => {
    const prevState = status[prop]
    status[prop] = newState
    const stateChanged = prevState !== undefined && newState !== prevState
    if (stateChanged) {
        eventEmitter.emit(prop, newState)
    }
}

const setLink = state =>
    update('link', state)

const getLink = () => 
    status.link

const setArmed = state =>
    update('armed', state)

const getArmed = () => 
    status.armed

const setAbort = state =>
    update('abort', state)

const getAbort = () =>
    status.abort

const setIntruder = state =>
    update('intruder', state)

const getIntruder = () =>
    status.intruder

const setPanic = state =>
    update('panic', state)

const getPanic = () =>
    status.panic

const setAutoArm = hour =>
    update('autoArm', hour)

const getAutoArm = () =>
    status.autoArm

const setAutoDisarm = hour =>
    update('autoDisarm', hour)

const getAutoDisarm = () =>
    status.autoDisarm

const toggleAutoDay = day =>
    status.autoDays[day] = !status.autoDays[day]

const getAutoDays = () =>
    status.autoDays.map(day => day ? '1' : '0').join('')

const isAutoDay = day =>
    status.autoDays[day]

const setAirQuality = value =>
    update('airQuality', value)

const getAirQuality = () =>
    status.airQuality

module.exports = {
    setLink, getLink,
    setArmed, getArmed,
    setAbort, getAbort,
    setIntruder, getIntruder,
    setPanic, getPanic,
    setAutoArm, getAutoArm,
    setAutoDisarm, getAutoDisarm,
    toggleAutoDay, getAutoDays, isAutoDay,
    setAirQuality, getAirQuality,
    on: (...args) => eventEmitter.on(...args)
}
