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
#define HEARTBEAT_WINDOW_MS 1500

SerialBridge bridge(Serial, LINK_SPEED, LED_BUILTIN, HEARTBEAT_WINDOW_MS);

void sendMessage(String msg) {
    if (bridge.isActive()) {
        bridge.serial.println(msg);
    }
}

AccentaG4 alarm(COMMS_RX_PIN, COMMS_TX_PIN, SIG_SET_PIN, SIG_ABORT_PIN,
                SIG_INT_PIN, SIG_PA_PIN, sendMessage);

// Sensors sensors(SENSORS_INTERVAL_MS, sendMessage);

void heartbeat() {
    bridge.heartbeat();
    bridge.serial.println("*");
}

void setup() {
    bridge.begin();
    alarm.begin();
    // sensors.begin();
}

void loop() {
    bridge.loop();
    alarm.loop();
    // sensors.loop();
    if (bridge.serial.available()) {
        char c = bridge.serial.read();
        if (c == '*') {
            heartbeat();
        } else {
            alarm.sendKey(c);
        }
    }
}
