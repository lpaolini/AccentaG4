/*
  AirSensor.h - Library for Air sensor CCS811.
  Created by Luca Paolini, March 30, 2019.
*/

#ifndef AirSensor_h
#define AirSensor_h

#include <Arduino.h>
#include <Adafruit_CCS811.h>

class AirSensor {
	private:
		Adafruit_CCS811 ccs;
		void (*sendMessage)(String msg);
		unsigned long delay;
		void calibrate();
		bool sample();
		bool enabled;
		unsigned long nextSample;

	public:
		AirSensor(unsigned long delay, void (*sendMessage)(String msg));
		void begin();
		void end();
		void loop();
};

#endif
