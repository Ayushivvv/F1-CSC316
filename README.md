# 🏎️ The Furious Five
## CSC316 Final Project

**Contributors:**
- Sonia Vaidya
- Alisa Iskakova
- Banke Akande
- Jonathan Qiao
- Ayusha Verma

## 🔗 Project Links

- **🌐 Live Website:** [https://ayushivvv.github.io/F1-CSC316/](https://ayushivvv.github.io/F1-CSC316/)
- **🎬 Project Video:** [Watch on Google Drive](https://drive.google.com/file/d/1h7-xI12YrC9kIciSWKI7m4fIMj9zmyZI/view?usp=sharing)

---

## 📖 Project Overview

Our project explores the world of **Formula One (F1)** through the lens of data.  Since its inception in 1950, F1 has hosted over **1,142 World Championship events** across 76 seasons, 34 countries, and 77 circuits.

Leveraging publicly available datasets, our team investigates the central question:

### **What Makes an F1 Champion?**

Specifically, we analyze how differences between teams and drivers, as well as race conditions and strategic choices, shape overall success in the championship.

## 🔍 Key Goals

- Explore historical and modern F1 data.
- Identify factors that distinguish champions from other competitors.
- Highlight the impact of teams, strategies, cars, and race conditions on performance.

---

## 📁 Project Structure & Code Attribution

### Our Code
| File/Folder | Description |
|-------------|-------------|
| `index.html` | Main HTML structure for the interactive visualization website |
| `css/style.css` | Custom styling for the entire application |
| `js/vis1.js` | **Visualization 1: The Driver** – Circuit race animation with driver tracking and leaderboard |
| `js/vis2.js` | **Visualization 2: The Machine** – Interactive 3D F1 car component exploration |
| `js/vis3.js` | **Visualization 3: The Conditions** – Weather impact analysis on race performance |
| `js/vis4. js` | **Visualization 4: The Race** – Starting grid to finish position analysis |
| `js/main.js` | Main application initialization and utilities |
| `js/audio.js` | Background music player controls |
| `scripts/` | Data processing and preparation scripts |

### External Libraries 
| Library | Version | Purpose |
|---------|---------|---------|
| [D3.js](https://d3js.org/) | v7 | Data visualization and DOM manipulation |
| [Three.js](https://threejs.org/) | v0. 160.0 | 3D graphics rendering for car visualization |
| [Google Fonts](https://fonts.google.com/) | - | Orbitron, Playfair Display, and Titillium Web fonts |

### Data Files
| Folder | Source | Description |
|--------|--------|-------------|
| `data/f1_kaggle/` | Kaggle | Historical F1 race, driver, and constructor data |
| `data/fastf1_data/` | FastF1 API | Lap timing, telemetry, and session data |
| `data/openf1_data/` | OpenF1 API | Weather, radio, and real-time race data |
| `data/f1_weather_2018_2023. csv` | OpenF1 | Weather conditions for races 2018-2023 |
| `data/driver_headshots_combined. csv` | Custom | Driver images and metadata |

### Assets
| Folder | Description |
|--------|-------------|
| `images/` | Team logos, driver headshots, and UI graphics |
| `aerials/` | Circuit aerial view images |
| `tracks/` | Circuit layout SVG files |
| `music/` | Background audio (Formula 1 Theme) |

---

## 🖥️ Interface Features & Usage Guide

### Audio Player (Top Right)
- Click **"Pause Theme"** to mute/unmute the F1 theme music
- Music auto-plays on page load

### Visualization 1: The Driver 🏁
- **Circuit Selection**: Use the dropdown to choose a race circuit
- **Playback Controls**: Play, Pause, and Replay buttons control the race animation
- **Race Slider**: Drag to scrub through the race timeline
- **Leaderboard**: Shows real-time top 5 positions during playback
- **Driver Profiles**: Click on any driver dot to open a detailed modal with career statistics (Points, Wins, Podiums, Race Starts)
- **Team Legend**: Color-coded team identification
- **Circuit Aerial**: Satellite view of the selected circuit

### Visualization 2: The Machine 🔧
- **Interactive 3D Car**: Hover and click on different parts of the F1 car
- **Component Details**: Modal popups explain how each part affects performance
- **Rotate/Zoom**: Use mouse controls to explore the 3D model

### Visualization 3: The Conditions 🌧️
- **Weather Selector**: Choose different weather parameters to analyze
- **Temperature Slider**: Move through races to see how conditions affect performance
- **Data Points**: Hover over points for detailed race information

### Visualization 4: The Race 🏆
- **Grid Animation**: Watch drivers move from starting position to finish
- **Hover Stats**: See positions gained/lost and key race statistics for each driver

---

## 📂 Main Data Sources

- **[Kaggle](https://www.kaggle.com/datasets/rohanrao/formula-1-world-championship-1950-2020)** – Comprehensive F1 data (1950-2020)
- **[OpenF1 API](https://openf1.org/)** – Historical and real-time race data
- **[FastF1 API](https://docs.fastf1.dev/)** – Lap timing and telemetry data
- **[F1DB](https://github.com/f1db/f1db)** – Detailed car build data

## 🖥 Other Sources

- **[Formula 1 Official Website](https://www.formula1.com/)** – Race-level summaries
- **[Big Data F1](https://www.bigdataf1. com/)** – Supplementary F1 statistics

---

## 🚀 How to Run

1. Clone the repository
2.  Open `index.html` in a modern web browser
3. No build process required – all dependencies are loaded via CDN

---