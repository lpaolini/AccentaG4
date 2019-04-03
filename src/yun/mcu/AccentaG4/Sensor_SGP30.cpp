/*
  Sensor_SGP30.cpp - Library for Adafruit SGP30 TVOC/CO2 sensor
  Created by Luca Paolini, April 3, 2019.
*/

#include "Sensor_SGP30.h"

Sensor_SGP30::Sensor_SGP30(unsigned long delay, void (*sendMessage)(String msg)) {
    this->delay = delay;
    this->sendMessage = sendMessage;
}

void Sensor_SGP30::begin() {
    if (sensor.begin()) {
        enabled = true;
    } else {
        sendMessage("SGP30:OFF");
    }
}
// void Sensor_SGP30::calibrate() {
    // while (!ccs.available());
    // float temp = ccs.calculateTemperature();
    // ccs.setTempOffset(temp - 25.0);
// }

void Sensor_SGP30::end() {
    if (enabled) {
        enabled = false;
    }
}

void Sensor_SGP30::loop(uint32_t absoluteHumidity) {
    if ((enabled) && millis() > nextSample) {
        sample(absoluteHumidity);
        nextSample = millis() + delay;
    }
}

void Sensor_SGP30::sample(uint32_t absoluteHumidity) {
    if (enabled) {
        if (!isnan(absoluteHumidity)) {
            status.absoluteHumidity = absoluteHumidity;
            sensor.setHumidity(absoluteHumidity);
        }
        if (sensor.IAQmeasure()) {            
            status.TVOC = sensor.TVOC;
            status.eCO2 = sensor.eCO2;
            sendMessage("SGP30:" 
                + String(status.TVOC) 
                + ':' + String(status.eCO2) 
            );
        } else {
            sendMessage("SGP30:ERR");
        }
    }
}

Status Sensor_SGP30::get() {
    return status;
}
