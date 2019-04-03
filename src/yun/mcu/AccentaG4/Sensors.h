/*
  Sensors.h - Library for 
	Adafruit SHT31 temperature/humidity sensor
  	Adafruit SGP30 TVOC/CO2 sensor
  Created by Luca Paolini, April 3, 2019.
*/

#ifndef Sensors_h
#define Sensors_h

#include <Arduino.h>
#include <Adafruit_SHT31.h>
#include <Adafruit_SGP30.h>

class Sensors {
	private:
		Adafruit_SHT31 sht31 = Adafruit_SHT31();
		Adafruit_SGP30 sgp30;
		void (*sendMessage)(String msg);
		unsigned long delay;
		// void calibrate();
    uint32_t getAbsoluteHumidity(float temperature, float humidity);
    bool sht31_enabled;
		bool sgp30_enabled;
		void begin_sht31();
		void begin_sgp30();
    void sample_sht31();
    void sample_sgp30();
		void end_sht31();
		void end_sgp30();
		void sample();
		unsigned long nextSample;
    struct Status {
      float temperature;
      float relativeHumidity;
      uint32_t absoluteHumidity;
      uint16_t TVOC;
      uint16_t eCO2;
    } status;

	public:
		Sensors(unsigned long delay, void (*sendMessage)(String msg));
		void begin();
		void end();
		void loop();
};

#endif
