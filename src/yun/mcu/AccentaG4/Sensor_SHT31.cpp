/*
  Sensor_SHT31.cpp - Library for Adafruit SHT31 temperature/humidity sensor
  Created by Luca Paolini, April 3, 2019.
*/

#include "Sensor_SHT31.h"

Sensor_SHT31::Sensor_SHT31(unsigned long delay, void (*sendMessage)(String msg)) {
    this->delay = delay;
    this->sendMessage = sendMessage;
}

void Sensor_SHT31::begin() {
    if (sensor.begin()) {
        enabled = true;
    } else {
        sendMessage("SHT31:OFF");
    }
}

uint32_t Sensor_SHT31::getAbsoluteHumidity(float temperature, float humidity) {
    // approximation formula from Sensirion SGP30 Driver Integration chapter 3.15
    const float absoluteHumidity = 216.7f * ((humidity / 100.0f) * 6.112f * exp((17.62f * temperature) / (243.12f + temperature)) / (273.15f + temperature)); // [g/m^3]
    const uint32_t absoluteHumidityScaled = static_cast<uint32_t>(1000.0f * absoluteHumidity); // [mg/m^3]
    return absoluteHumidityScaled;
}

void Sensor_SHT31::end() {
    if (enabled) {
        enabled = false;
    }
}

void Sensor_SHT31::loop() {
    if (enabled && millis() > nextSample) {
        sample();
        nextSample = millis() + delay;
    }
}

void Sensor_SHT31::sample() {
    if (enabled) {
        status.temperature = sensor.readTemperature();
        status.relativeHumidity = sensor.readHumidity();
        if (!isnan(status.temperature) && !isnan(status.relativeHumidity)) {
            status.absoluteHumidity = getAbsoluteHumidity(status.temperature, status.relativeHumidity);
            sendMessage("SHT31:" 
                + String(status.temperature) 
                + ':' + String(status.relativeHumidity)
            );
        } else {
            sendMessage("SHT31:ERR");
        }
    }
}

Status Sensor_SHT31::get() {
    return status;
}
