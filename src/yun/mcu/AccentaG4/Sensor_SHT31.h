/*
  Sensor_SHT31.h - Library for Adafruit SHT31 temperature/humidity sensor
  Created by Luca Paolini, April 3, 2019.
*/

#ifndef Sensor_SHT31_h
#define Sensor_SHT31_h

#include <Arduino.h>
#include <Adafruit_SHT31.h>

struct Status {
    float temperature;
    float relativeHumidity;
    uint32_t absoluteHumidity;
};

class Sensor_SHT31 {
	private:
		Adafruit_SHT31 sensor = Adafruit_SHT31();
		void (*sendMessage)(String msg);
		unsigned long delay;
		// void calibrate();
    uint32_t getAbsoluteHumidity(float temperature, float humidity);
		bool enabled;
    struct Status status;
		void sample();
		unsigned long nextSample;

	public:
		Sensor_SHT31(unsigned long delay, void (*sendMessage)(String msg));
		void begin();
		void end();
		void loop();
    Status get();
};

#endif
