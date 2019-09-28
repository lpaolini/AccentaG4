#include "AccentaG4.h"
// #include "Sensors.h"
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
#define ENABLE_CHAR '*'
#define DISABLE_CHAR '-'
#define ENABLE_GRACE_MS 1500

void enableHandler(HardwareSerial serial, char enableChar) {
    serial.println(enableChar);
}

void disableHandler(HardwareSerial serial, char disableChar) {
    serial.println(disableChar);
}

SerialBridge bridge(Serial, LINK_SPEED, LED_BUILTIN, ENABLE_CHAR, DISABLE_CHAR,
                    ENABLE_GRACE_MS, enableHandler, disableHandler);

void sendMessage(String msg) {
    if (bridge.isEnabled()) {
        bridge.serial.println(msg);
    }
}

AccentaG4 alarm(COMMS_RX_PIN, COMMS_TX_PIN, SIG_SET_PIN, SIG_ABORT_PIN,
                SIG_INT_PIN, SIG_PA_PIN, sendMessage);

// Sensors sensors(SENSORS_INTERVAL_MS, sendMessage);

void setup() {
    bridge.begin();
    alarm.begin();
    // sensors.begin();
}

void loop() {
    bridge.loop();
    alarm.loop();
    // sensors.loop();

    int c = bridge.enabledAwareRead();
    if (bridge.isEnabled() && c != -1) {
        alarm.sendKey(c);
    }
}
