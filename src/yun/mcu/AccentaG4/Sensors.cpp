/*
  Sensors.cpp - Library for 
	Adafruit SHT31 temperature/humidity sensor
  	Adafruit SGP30 TVOC/CO2 sensor
  Created by Luca Paolini, April 3, 2019.
*/

#include "Sensors.h"

Sensors::Sensors(unsigned long delay, void (*sendMessage)(String msg)) {
    this->delay = delay;
    this->sendMessage = sendMessage;
}

void Sensors::begin_sht31() {
    if (sht31.begin(0x44)) {
        sht31_enabled = true;
    } else {
        sendMessage("SHT31:OFF");
    }
}

void Sensors::begin_sgp30() {
    if (sgp30.begin()) {
        sgp30_enabled = true;
    } else {
        sendMessage("SGP30:OFF");
    }
}

void Sensors::begin() {
    begin_sht31();
    begin_sgp30();
}

// void Sensors::calibrate() {
    // while (!ccs.available());
    // float temp = ccs.calculateTemperature();
    // ccs.setTempOffset(temp - 25.0);
// }

uint32_t Sensors::getAbsoluteHumidity(float temperature, float humidity) {
    // approximation formula from Sensirion SGP30 Driver Integration chapter 3.15
    const float absoluteHumidity = 216.7f * ((humidity / 100.0f) * 6.112f * exp((17.62f * temperature) / (243.12f + temperature)) / (273.15f + temperature)); // [g/m^3]
    const uint32_t absoluteHumidityScaled = static_cast<uint32_t>(1000.0f * absoluteHumidity); // [mg/m^3]
    return absoluteHumidityScaled;
}

void Sensors::end_sht31() {
    if (sht31_enabled) {
        sht31_enabled = false;
    }
}

void Sensors::end_sgp30() {
    if (sgp30_enabled) {
        sgp30_enabled = false;
    }
}

void Sensors::end() {
    end_sht31();
    end_sgp30();
}

void Sensors::loop() {
    if ((sht31_enabled || sgp30_enabled) && millis() > nextSample) {
        sample();
        nextSample = millis() + delay;
    }
}

void Sensors::sample() {
    sample_sht31();
    sample_sgp30();
}

void Sensors::sample_sht31() {
    if (sht31_enabled) {
        status.temperature = sht31.readTemperature();
        status.relativeHumidity = sht31.readHumidity();
        
        if (!isnan(status.temperature) && !isnan(status.relativeHumidity)) {
            sendMessage("SHT31:" 
                + String(status.temperature) 
                + ':' + String(status.relativeHumidity)
            );
        } else {
            sendMessage("SHT31:ERR");
        }
    }
}

void Sensors::sample_sgp30() {
    if (sgp30_enabled) {
        if (!isnan(status.temperature) && !isnan(status.relativeHumidity)) {
            sgp30.setHumidity(getAbsoluteHumidity(status.temperature, status.relativeHumidity));
        }
        if (sgp30.IAQmeasure()) {
            
            sendMessage("SGP30:" 
                + String(sgp30.TVOC) 
                + ':' + String(sgp30.eCO2) 
            );
        } else {
            sendMessage("SGP30:ERR");
        }
    }
}
