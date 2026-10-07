# 🛸 WaveEditor

> Web-based visual editor and simulator for enemy wave patterns in **Simonetta: Phenomenally Fresh** (SHMUP).

**WaveEditor** allows game designers to create, calibrate, and visually preview 2D enemy flight trajectories in real-time before exporting them to JSON for the game engine.

---

## ✨ Features

- **Real-Time Canvas Simulation**:
  - Accurate step-by-step numerical trajectory preview on a simulated **Full HD (1920×1080)** coordinate space.
  - **Single Entity Mode**: Live playback with playback time, distance, and off-screen detection.
  - **Wave Simulation Mode**: Preview all active enemies in the wave simultaneously, respecting individual spawn delays.
- **Supported Mover Physics**:
  - `Lissajous`: Harmonically undulating velocity patterns.
  - `Swoop`: High-speed dive-bombing with half-sine swoop curve.
  - `StopAndGo`: Decelerated entrance, vertical hovering bobbing, and high-speed retreat.
  - `Circular`: Circular loop maneuvers with adjustable radius and angular velocity.
- **Workflow & Interoperability**:
  - **Drag & Drop JSON**: Instantly load existing wave JSON files by dropping them anywhere on the page.
  - **Download / Copy JSON**: Clean export matching the game engine's entity descriptor schema.
  - **Pipeline Integration**: Seamless cross-editor data sharing via `localStorage` with `LevelEditor` and `EntityEditor`.
- **Arcade Aesthetic**:
  - Cyber-space retro theme inspired by *Simonetta: Phenomenally Fresh* (Neon Simonetta Pink UI with glowing Alien Slime Green radar previews).

---

## 🛠️ Pipeline Architecture

The toolchain is completely client-side and serverless, passing data between GitHub Pages via browser `localStorage`:

```text
[EntityEditor] ──(shmup_entity_types)──> [WaveEditor] ──(shmup_waves)──> [LevelEditor]
```

1) EntityEditor defines available enemy types (shmup_entity_types).
2) WaveEditor binds enemies to movement curves and spawn delays, saving completed waves into shmup_waves.
3) LevelEditor pulls wave IDs automatically to arrange the level timeline and progression.

---

## 📐 Movement Types & Parameters

All movements share the common parameter:

* `startPosition` (Float `0.0 – 1.0`): Normalized vertical entry position (`0.0` = bottom, `0.5` = middle, `1.0` = top).
* `Spawn delay (s) (h)`: Time offset before the entity appears.

| Movement | Specific Parameters | Description |
| :--- | :--- | :--- |
| `Lissajous` | `baseSpeedX`, `ampX`, `ampY`, `freq` | Sinusoidal flight path in X and Y. |
| `Swoop` | `enterSpeed`, `swoopSpeed`, `diveDelay`, `diveDuration` | Straight horizontal entry, followed by a parabolic dive and rapid level-out retreat. |
| `StopAndGo` | `enterSpeed`, `enterDuration`, `hoverDuration`, `retreatSpeed` | Decelerates to a halt, hovers with cosine bobbing, then escapes at high speed. |
| `Circular` | `hSpeed`, `radius`, `angularSpeed`, `startAngle` | Continuous leftward translation combined with circular loops. |

---

## 📄 JSON Schema Example

```json
{
  "id": "Wave_Squadron_01",
  "meta": "medium",
  "duration": "12.0",
  "entities": [
    "Slug_soldier,0,true,Swoop,0.8,250,400,1.2,1.5",
    "Slug_soldier,0.4,true,Swoop,0.8,250,400,1.2,1.5",
    "Slug_captain,0.5,true,StopAndGo,0.5,350,1.0,2.5,450"
  ]
}
```
Each entity string is serialized as:

```text
<type>,<spawnDelay>,<enabled>,<moverName>,<startPosition>,<...moverArgs>
```

---

## 🚀 Getting Started

No build step or dependencies required. Simply open index.html in any modern web browser or serve via GitHub Pages:

```bash
git clone https://github.com/pesegato/WaveEditor.git
cd WaveEditor
# Open directly or run a lightweight local server:
python3 -m http.server 8080
```