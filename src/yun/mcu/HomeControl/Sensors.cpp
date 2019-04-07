/*
  Sensors.cpp - Library for
        Adafruit SHT31 temperature/humidity sensor
        Adafruit SGP30 TVOC/CO2 sensor
  Created by Luca Paolini, April 3, 2019.
*/

#include "Sensors.h"

Sensors::Sensors(unsigned long interval, void (*sendMessage)(String msg)) {
    this->interval = interval;
    this->sendMessage = sendMessage;
}

void Sensors::begin_sht31() {
    if (sht31.begin(0x44)) {
        sht31_enabled = true;
        sendMessage("SEN:SHT31 detected " + String(sht31.readSerialNumber()));
    } else {
        sendMessage("SEN:SHT31 not detected");
    }
}

void Sensors::begin_sgp30() {
    if (sgp30.begin()) {
        sgp30_enabled = true;
        sendMessage("SEN:SGP30 detected");
    } else {
        sendMessage("SEN:SGP30 not detected");
    }
}

void Sensors::begin() {
    begin_sht31();
    begin_sgp30();
}

uint32_t Sensors::getAbsoluteHumidity(float temperature, float humidity) {
    // approximation formula from Sensirion SGP30 Driver Integration
    // chapter 3.15
    const float absoluteHumidity =
        216.7f * ((humidity / 100.0f) * 6.112f *
                  exp((17.62f * temperature) / (243.12f + temperature)) /
                  (273.15f + temperature)); // [g/m^3]
    const uint32_t absoluteHumidityScaled =
        static_cast<uint32_t>(1000.0f * absoluteHumidity); // [mg/m^3]
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
    unsigned long currentMillis = millis();
    if ((sht31_enabled || sgp30_enabled) && currentMillis > nextSample) {
        sample();
        nextSample = currentMillis + interval;
    }
}

void Sensors::sample() {
    sample_sht31();
    sample_sgp30();
    sendMessage("AIR:" + String(status.temperature) + ":" +
                String(status.relativeHumidity) + ":" +
                String(status.absoluteHumidity) + ":" + String(status.TVOC) +
                ":" + String(status.eCO2));
}

void Sensors::sample_sht31() {
    if (sht31_enabled) {
        SHT31D result = sht31.readTempAndHumidity(SHT3XD_REPEATABILITY_LOW,
                                                  SHT3XD_MODE_POLLING, 50);
        if (result.error == SHT3XD_NO_ERROR) {
            status.temperature = result.t;
            status.relativeHumidity = result.rh;
            if (!isnan(status.temperature) && !isnan(status.relativeHumidity)) {
                status.absoluteHumidity = getAbsoluteHumidity(
                    status.temperature, status.relativeHumidity);
            } else {
                status.absoluteHumidity = NAN;
            }
        } else {
            sendMessage("SEN: SHT31 " + String(result.error));
            status.temperature = NAN;
            status.relativeHumidity = NAN;
        }
    }
}

void Sensors::sample_sgp30() {
    if (sgp30_enabled) {
        if (!isnan(status.absoluteHumidity)) {
            sgp30.setHumidity(status.absoluteHumidity);
        }
        if (sgp30.IAQmeasure()) {
            status.TVOC = sgp30.TVOC;
            status.eCO2 = sgp30.eCO2;
        } else {
            sendMessage("SEN: SGP30 error");
            status.TVOC = NAN;
            status.eCO2 = NAN;
        }
    }
}
