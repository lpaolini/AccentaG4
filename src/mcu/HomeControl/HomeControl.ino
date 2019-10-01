#include "AccentaG4.h"
#include "Sensors.h"
#include "SerialBridge.h"

#define COMMS_RX_PIN 10
#define COMMS_TX_PIN 11
#define SIG_ABORT_PIN 2
#define SIG_SET_PIN 3
#define SIG_INT_PIN 4
#define SIG_PA_PIN 5
#define LINK_SPEED 115200
#define CONSOLE_SPEED 115200
#define SENSORS_INTERVAL_MS 5000
#define ENABLE_CHAR '+'
#define DISABLE_CHAR '-'
#define ENABLE_GRACE_MS 1500

void enableHandler(HardwareSerial serial, char enableChar, boolean justEnabled);
void disableHandler(HardwareSerial serial, char disableChar, boolean justDisabled);
void readHandler(HardwareSerial serial, char c);
void sendMessage(String msg);

SerialBridge bridge(Serial, LINK_SPEED, LED_BUILTIN, ENABLE_CHAR, DISABLE_CHAR,
                    ENABLE_GRACE_MS, enableHandler, disableHandler, readHandler);

AccentaG4 accentaG4(COMMS_RX_PIN, COMMS_TX_PIN, SIG_SET_PIN, SIG_ABORT_PIN,
                SIG_INT_PIN, SIG_PA_PIN, sendMessage);

Sensors sensors(SENSORS_INTERVAL_MS, sendMessage);

void enableHandler(HardwareSerial serial, char enableChar, boolean justEnabled) {
    serial.println(enableChar);
    if (justEnabled) {
        sensors.begin();
    }
}

void disableHandler(HardwareSerial serial, char disableChar, boolean justDisabled) {
    serial.println(disableChar);
    if (justDisabled) {
        sensors.end();
    }
}

void readHandler(HardwareSerial serial, char c) {
    accentaG4.sendKey(c);
}

void sendMessage(String msg) {
    if (bridge.isEnabled()) {
        bridge.serial.println(msg);
    }
}

void setup() {
    bridge.begin();
    accentaG4.begin();
    sensors.begin();
}

void loop() {
    bridge.loop();
    accentaG4.loop();
    sensors.loop();
}
