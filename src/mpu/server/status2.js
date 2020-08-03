const _ = require('lodash')
const config = require('./config')
const Notify = require('./notify')
const notify = Notify(config.notify)

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
    return prevState !== undefined && newState !== prevState
}

const setLink = state =>
    update('link', state)
        && notify(`Alarm panel link ${state ? 'up' : 'down'}`)

const getLink = () => 
    status.link

const setArmed = state =>
    update('armed', state)
        && notify(`Alarm ${state ? 'armed' : 'disarmed'}`)

const getArmed = () => 
    status.armed

const setAbort = state =>
    update('abort', state)
        && notify(`Alarm ${state ? 'aborted' : 'reset'}`)

const getAbort = () =>
    status.abort

const setIntruder = state =>
    update('intruder', state)
        && notify(`INTRUDER alarm ${state ? 'activated [!]' : 'deactivated'}`)

const getIntruder = () =>
    status.intruder

const setPanic = state =>
    update('panic', state)
        && notify(`PANIC alarm ${state ? 'activated [!]' : 'deactivated'}`)

const getPanic = () =>
    status.panic

const setAutoArm = hour =>
    update('autoArm', hour)
        && console.info(hour === -1 ? 'Auto-arm disabled' : 'Auto-arm enabled at ' + hour + ':00')

const getAutoArm = () =>
    status.autoArm

const setAutoDisarm = hour =>
    update('autoDisarm', hour)
        && console.info(hour === -1 ? 'Auto-disarm disabled' : 'Auto-disarm enabled at ' + hour + ':00')

const getAutoDisarm = () =>
    status.autoDisarm

const toggleAutoDay = day => {
    status.autoDays[day - 1] = !status.autoDays[day - 1]
    console.info(`Auto-arm/disarm days: ${getAutoDays()}`)
}

const getAutoDays = () =>
    status.autoDays.map(day => day ? '1' : '0').join('')

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
    toggleAutoDay, getAutoDays,
    setAirQuality, getAirQuality
}
