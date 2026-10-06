# 🐾 SmartPaw AI

## AI-Powered Smart Multi-Pet Feeding System

SmartPaw AI is a low-cost intelligent pet feeding system that uses an **AI-Thinker ESP32-CAM, TinyML, IR sensor, servo motors, Firebase, and a web dashboard** to identify pets and control individual food dispensers.

### Supported Pets

- 🐶 Dog
- 🐱 Cat
- 🐹 Hamster
- ❓ Unknown

---

## 🌐 Live Website

**https://logicwithharshal.github.io/SmartPaw-AI/**

---

## ✨ Features

- AI-based pet classification
- ESP32-CAM image capture
- TinyML inference on ESP32-CAM
- IR-based pet detection
- Individual food dispensers
- 3 servo-controlled dispensing mechanisms
- Firebase integration
- Web-based monitoring and control
- Feeding history/status
- Unknown-pet classification

---

## ⚙️ How It Works

```text
IR Sensor
    ↓
Pet Detected
    ↓
ESP32-CAM Captures Image
    ↓
TinyML Model
    ↓
Dog / Cat / Hamster / Unknown
    ↓
Corresponding Servo
    ↓
Food Dispensed
    ↓
Firebase
    ↓
Web Dashboard
