# MyChron Connect — Design Spec

**Date:** 2026-04-11
**Status:** Draft
**Author:** Tyler Prestel + Claude

---

## Overview

MyChron Connect is a mobile app for karting drivers, mechanics, and coaches. It connects to AIM MyChron devices (5, 5S, 6) over WiFi, downloads session data, and displays lap times, RPM metrics, and engine temperatures on the phone — eliminating the need to bring a laptop to the kart.

The primary use case is a **coach walking the pit lane**: connect to each kart's MyChron, grab the session, tag it to a driver, move on, then review everyone's data from the phone.

**Target platforms:** iOS and Android
**Monetization:** Freemium
**v1 scope:** Post-session data viewer (no live/real-time display)

---

## Architecture

Four layers, loosely coupled. The parser is isolated so it can be swapped or updated without affecting the rest of the app.

### 1. Connection Layer

Handles WiFi discovery and communication with MyChron devices.

- Detects when the phone is on a MyChron WiFi network
- Identifies the connected device model (5, 5S, 6)
- Lists available sessions on the device
- Downloads raw session files (`.drk` format) from the device

The MyChron acts as a WiFi access point (hotspot). The phone connects to it as a client. The communication protocol is currently unknown and must be reverse-engineered (see Protocol section).

### 2. Parser Layer

Decodes raw `.drk` files into structured data.

**Input:** Raw binary `.drk` file
**Output:** Structured JSON with session metadata, lap times, and channel data arrays

This is the highest-risk component. The `.drk` file format is proprietary and undocumented. The parser must be built through reverse-engineering.

### 3. Storage Layer

Persists parsed sessions locally on the phone.

- **SQLite** (expo-sqlite) for session metadata, lap times, computed stats, and indexed queries
- **File system** (expo-file-system) for raw `.drk` files and large channel data arrays
- No cloud backend — everything stays on-device for v1

Raw `.drk` files are always retained so old sessions can be re-parsed when the parser improves.

### 4. Presentation Layer

React Native screens optimized for pit-lane use: big numbers, high contrast, readable in sunlight, minimal taps, large touch targets.

---

## MyChron WiFi Protocol

### What We Know

- MyChron 5, 5S, and 6 all have built-in WiFi
- AIM's RaceStudio 3 desktop software uses WiFi to sync session data
- The MyChron likely acts as a WiFi access point
- Session data is stored in `.drk` files on the device

### Reverse-Engineering Plan

1. **Network sniffing** — Connect a laptop to the MyChron's WiFi. Run Wireshark. Trigger a sync from RaceStudio 3. Capture all traffic to identify: protocol (HTTP, FTP, raw TCP), endpoints, file transfer mechanism, authentication.
2. **File format analysis** — Download `.drk` files and analyze in a hex editor. Look for headers, magic bytes, known patterns. Cross-reference with open-source community projects that parse AIM data.
3. **Protocol documentation** — Document the communication protocol so the connection layer can be built reliably.

### Risks

- AIM could use encryption or authentication in their protocol. If so, we'll need to find keys or workarounds during the sniffing phase.
- The protocol may differ between MyChron 5, 5S, and 6. Each model may need its own connection handler.
- This is the single biggest technical risk in the project.

---

## Data Model

### Session

```
Session
├── id (UUID)
├── created_at (timestamp)
├── device_model ("mychron5" | "mychron5s" | "mychron6")
├── track_name (from device if available, otherwise user-entered)
├── driver_id (FK to Driver)
├── kart_number (string)
├── session_group_id (FK to SessionGroup, nullable)
├── raw_file_path (path to stored .drk file)
├── lap_count
├── best_lap_time (ms)
├── session_rpm_min
├── session_rpm_max
├── session_rpm_std_dev
├── session_engine_temp_min
├── session_engine_temp_max
├── session_engine_temp_std_dev
├── lap_time_std_dev
└── laps[]
```

### Lap

```
Lap
├── id (UUID)
├── session_id (FK)
├── lap_number
├── lap_time (ms)
├── lap_time_delta (difference from session best, ms)
├── sector_times[] (if sectors configured on MyChron)
├── flag ("best" | "worst" | "invalid" | null)
├── rpm_min
├── rpm_max
├── rpm_avg
├── rpm_std_dev
├── engine_temp_min
├── engine_temp_max
├── engine_temp_avg
├── engine_temp_std_dev
```

### Channel Data (stored as files, referenced from session)

```
Channels
├── rpm[] (timestamped values)
├── engine_temp[] (timestamped values — whichever temp channels the device logs: water, EGT, CHT)
├── speed[] (if GPS-equipped, timestamped)
└── [any other channels the device logs]
```

Note: MyChron devices can log multiple temperature channels depending on sensor configuration (water temp, exhaust gas temp, cylinder head temp). The parser should extract all available temp channels. For v1, the UI aggregates them under "engine temp" using whichever primary temp channel is present. Future versions can break these out individually.

### Driver

```
Driver
├── id (UUID)
├── name
├── default_kart_number (optional)
├── created_at
```

### Session Group

```
SessionGroup
├── id (UUID)
├── name (e.g., "Practice 3", auto-generated or user-entered)
├── created_at
├── sessions[] (all sessions grabbed in the same time window)
```

Sessions grabbed within the same configurable time window (default: 30 minutes) are auto-grouped. Users can rename groups or manually reassign sessions.

---

## Screens

### 1. Grab (Home Tab)

The coach's primary screen. Designed for speed — connect, tag, move on.

**Flow:**
1. Screen shows "Ready to Connect" with a large connect button
2. Tap connect → app checks if phone is on a MyChron WiFi network
3. If not, prompt user to switch WiFi networks (with clear instructions, especially on iOS)
4. Once connected, show available sessions on the device with date/time
5. Select session(s) to download
6. Pick driver from quick-select roster (big tap targets, favorites/recent at top)
7. Optionally enter/select kart number
8. Tap "Save & Next" → data downloads, parses, stores
9. Screen returns to "Ready to Connect" for the next kart

**Design priorities:** Minimal taps. No typing required if driver roster is pre-loaded. Entire flow should take under 15 seconds per kart (excluding transfer time).

### 2. Sessions (Tab)

Browse all downloaded sessions.

- List view sorted by most recent
- Each row: date/time, driver name, kart #, best lap time, lap count
- Filter by: driver, date range, track
- Tap a session group header to expand/collapse
- Tap a session to open Session Detail

### 3. Session Detail

Stats for a single session.

- **Hero stat:** Best lap time (large, bold)
- **Summary cards:** Lap count, lap time std dev, RPM min/max, engine temp min/max
- **Lap table:** Each lap row shows: lap number, lap time, delta to best, RPM min/max, temp min/max
- **Color coding:** Green = best lap, red = worst, yellow = temp above warning threshold
- Tap a lap to open Lap Detail

### 4. Lap Detail

Deep dive into a single lap.

- All channel stats: RPM range + avg + std dev, temp range + avg + std dev
- Sector times (if available)
- Placeholder area for future v2 time-series charts and data overlay

### 5. Drivers (Tab)

Manage the driver roster.

- List of drivers with name and default kart number
- Add / edit / remove drivers
- Tap-and-hold to set a driver as favorite (appears first in Grab screen picker)

### 6. Compare (v1 stretch / v1.1)

Side-by-side comparison of two drivers from the same session group.

- Pick two drivers from a session group
- Show: best lap, average lap, lap time std dev, RPM and temp ranges
- Highlights where one driver has a clear advantage

### 7. Settings

- Temp warning threshold (configurable per engine type, e.g., Rotax vs X30)
- Units (metric / imperial)
- Session auto-group time window (default 30 min)
- About / version info

---

## Freemium Model

### Free Tier
- Connect to MyChron and download sessions
- Session list with basic info (date, driver, best lap)
- Best lap time per session
- Basic lap table (lap number + lap time only)

### Paid Tier (one-time purchase or subscription — TBD)
- Full stats: min/max/avg/std dev for RPM and temps
- Lap time delta and consistency metrics
- Lap Detail screen
- Driver roster (free tier limited to 2 drivers)
- Compare view
- CSV export
- Session grouping and filtering

The exact pricing and whether it's a one-time IAP or subscription will be determined based on market research.

---

## Tech Stack

- **Framework:** React Native with Expo
- **Language:** TypeScript
- **Navigation:** React Navigation (bottom tab navigator: Grab | Sessions | Drivers | Settings)
- **Storage:** expo-sqlite for structured data, expo-file-system for raw files
- **WiFi:** react-native-wifi-reborn or expo-network for WiFi detection; may need native modules for programmatic WiFi switching
- **State management:** React Context or Zustand (lightweight, sufficient for this scope)
- **Charting (future):** react-native-chart-kit or Victory Native for v2 data overlays

### iOS WiFi Caveat

Apple restricts programmatic WiFi network switching. The app will need to either:
- Use NEHotspotConfiguration API (requires Apple entitlement approval)
- Prompt the user to manually switch to the MyChron WiFi in iOS Settings, then return to the app

The Grab screen must handle this gracefully with clear step-by-step instructions. This is a known limitation — apps like DJI and GoPro deal with the same constraint.

---

## Project Structure

```
apps/mychron-connect/
├── src/
│   ├── connection/     — WiFi discovery, device communication
│   ├── parser/         — .drk file decoding
│   ├── storage/        — SQLite schema, queries, file management
│   ├── screens/        — Grab, Sessions, SessionDetail, LapDetail, Drivers, Compare, Settings
│   ├── components/     — shared UI (stat cards, lap table, driver picker)
│   └── models/         — TypeScript types (Session, Lap, Channel, Driver, SessionGroup)
├── assets/             — app icon, splash screen
├── app.json            — Expo config
└── package.json
```

Located at `apps/mychron-connect/` in the Soloprenuer monorepo.

---

## Future Versions (Out of Scope for v1)

- **v2:** Time-series charts per lap (RPM curve, temp curve over lap distance/time). Data overlay similar to RaceStudio 3.
- **v2:** Live real-time data display while kart is on track
- **v2+:** GPS track map with data overlay (speed/RPM mapped to track position)
- **v2+:** Cloud sync / team sharing (coach shares annotated sessions with drivers)
- **v2+:** Compare laps within a session (driver's best vs worst)
- **v2+:** Export to common formats for use in other analysis tools
