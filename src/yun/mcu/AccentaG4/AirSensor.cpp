/*
  AirSensor.cpp - Library for Air sensor CCS811.
  Created by Luca Paolini, March 30, 2019.
*/

#include "AirSensor.h"

AirSensor::AirSensor(unsigned long delay, void (*sendMessage)(String msg)) {
    this->delay = delay;
	this->sendMessage = sendMessage;
}

void AirSensor::begin() {
    if(ccs.begin()){
        calibrate();
        enabled = true;
    } else {
        sendMessage("A:OFF");
    }
}

void AirSensor::calibrate() {
    while (!ccs.available());
    float temp = ccs.calculateTemperature();
    ccs.setTempOffset(temp - 25.0);
}

void AirSensor::end() {
    if (enabled) {
        // ccs.end();
        enabled = false;
    }
}

void AirSensor::loop() {
    if (enabled && millis() > nextSample) {
        if (sample()) {
            nextSample = millis() + delay;
        }
    }
}

bool AirSensor::sample() {
    if (ccs.available()) {
        if (ccs.readData()) {
            sendMessage("A:" 
                + String(ccs.calculateTemperature()) 
                + ':' + String(ccs.geteCO2()) 
                + ':' + String(ccs.getTVOC())
            );
        } else {
            sendMessage("A:ERR");
        }
        return true;
    }
    return false;
}
