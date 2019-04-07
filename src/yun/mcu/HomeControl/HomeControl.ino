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
#define HEARTBEAT_MS 2000
#define SENSORS_INTERVAL_MS 5000

unsigned long nextHeartbeat = millis() + HEARTBEAT_MS;
unsigned long lastMessage;

void sendMessage(String msg) {
    handleMessage(msg);
    lastMessage = millis();
}

SerialBridge bridge(Serial1, LINK_SPEED, LED_BUILTIN);

AccentaG4 alarm(COMMS_RX_PIN, COMMS_TX_PIN, SIG_SET_PIN, SIG_ABORT_PIN,
                SIG_INT_PIN, SIG_PA_PIN, sendMessage);

Sensors sensors(SENSORS_INTERVAL_MS, sendMessage);

void handleMessage(String msg) {
    bridge.serial.println(msg);
    nextHeartbeat = millis() + HEARTBEAT_MS;
}

void heartbeat() {
    unsigned long currentMillis = millis();
    if (currentMillis > nextHeartbeat) {
        handleMessage("HBT:" + String((currentMillis - lastMessage) / 1000));
    }
}

void setup() {
    bridge.begin();
    alarm.begin();
    sensors.begin();
    Serial.println("Ready");
}

void loop() {
    bridge.loop();
    alarm.loop();
    sensors.loop();
    if (bridge.serial.available()) {
        alarm.sendKey(bridge.serial.read());
    }
    heartbeat();
}
