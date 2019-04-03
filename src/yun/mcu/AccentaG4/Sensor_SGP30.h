/*
  Sensors.h - Library for Adafruit SGP30 TVOC/CO2 sensor
  Created by Luca Paolini, April 3, 2019.
*/

#ifndef Sensor_SGP30_h
#define Sensor_SGP30_h

#include <Arduino.h>
#include <Adafruit_SGP30.h>

struct Status {
    uint32_t absoluteHumidity;
    uint16_t TVOC;
    uint16_t eCO2;
};

class Sensor_SGP30 {
	private:
		Adafruit_SGP30 sensor;
		void (*sendMessage)(String msg);
		unsigned long delay;
		// void calibrate();
		bool enabled;
		unsigned long nextSample;
    struct Status status;
		void sample(uint32_t absoluteHumidity);

	public:
		Sensor_SGP30(unsigned long delay, void (*sendMessage)(String msg));
		void begin();
		void end();
		void loop(uint32_t absoluteHumidity);
    Status get();
};

#endif
