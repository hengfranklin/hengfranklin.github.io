---
layout: project
title: Breathily
description: Contactless lung function for ALS patients using Intel RealSense depth cameras. Real-time skeleton-tracked chest ROI, 6-stage depth filter chain, regression-based depth-to-volume calibration, full PFT panel from chest wall motion. US Patent.
img: assets/img/projects/breathily_pipeline.png
importance: 4
category: cv-ml
affiliation: Breathily
featured: true
date: 2020-03-01
date_display: Mar 2020 – Mar 2022
role: Co-founder & CV Engineer · Breathily (UCSF)
---

> 🥈 2nd place, UC Launch · Funded by UCSF Catalyst · NSF I-Corps · 📜 [US Patent](https://patents.google.com/patent/US20240090795A1/en)

## Overview

Breathily was a startup that developed a contactless system for lung function assessment in patients with physical disabilities, including ALS and related neuromuscular conditions. Standard spirometry requires a tight mouth seal and forceful exhalation, which is difficult or impossible for patients with facial muscle weakness or limited mobility. Breathily estimates pulmonary function from **chest wall motion** captured by an Intel RealSense depth camera — no mouthpiece required — and reports the full spirometric panel (FVC, FEV1, FEV1/FVC, PEF, FEF25/50/75, FEF25–75) in real time.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/breathily_pipeline.png" class="img-fluid rounded z-depth-1" zoomable=true %}
  </div>
</div>
<div class="caption">
  Processing pipeline: depth + color capture → skeleton tracking → chest region segmentation → segment-wise depth signals → Breathily vs. spirometer curves.
</div>

## Demo

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    <div class="embed-responsive embed-responsive-16by9 rounded z-depth-1" style="overflow: hidden;">
      <iframe
        class="embed-responsive-item"
        src="https://www.youtube.com/embed/MaBf3D1GvQA"
        title="Breathily overview demo"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen></iframe>
    </div>
  </div>
</div>
<div class="caption">
  Overview demo of the Breathily contactless spirometry system.
</div>

### Spirometer Comparison

Side-by-side comparison of Breathily and standard spirometry.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    <video controls playsinline preload="auto" class="rounded z-depth-1" style="width: 100%; max-width: 100%; height: auto;">
      <source src="{{ '/assets/video/projects/breathily_spirometer_comparison.mp4' | relative_url }}" type="video/mp4">
      Your browser does not support embedded video. <a href="{{ '/assets/video/projects/breathily_spirometer_comparison.mp4' | relative_url }}">Download the clip</a>.
    </video>
  </div>
</div>

### Clinical Lab Testing

Testing setup at the UCSF Adult Pulmonary Function Lab during IRB-approved studies.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    <video controls playsinline preload="auto" class="rounded z-depth-1" style="width: 100%; max-width: 100%; height: auto;">
      <source src="{{ '/assets/video/projects/breathily_clinical_lab_testing.mp4' | relative_url }}" type="video/mp4">
      Your browser does not support embedded video. <a href="{{ '/assets/video/projects/breathily_clinical_lab_testing.mp4' | relative_url }}">Download the clip</a>.
    </video>
  </div>
</div>

## Recognition

- 2nd Place, UC Launch Accelerator Program
- Funding and support from the UCSF Catalyst Program
- NSF I-Corps participant
- US Patent Application [US20240090795A1](https://patents.google.com/patent/US20240090795A1/en)

## End-to-End Pipeline

```
RealSense depth + color stream (1280×720 @ 30 fps, z16 + bgr8)
  → depth post-processing chain (decimation → disparity →
       spatial → temporal → disparity⁻¹ → hole-filling)
  → depth-color frame alignment (rs.align)
  → Cubemos 2D skeleton tracking on color frame
  → 3D keypoint deprojection (median depth in 5×5 px kernel
       per joint, via rs2_deproject_pixel_to_point)
  → real-time posture quality checks (rocking, side, shoulder,
       neck, leg) against per-session baselines
  → chest ROI extraction from shoulder + wrist joints
       (top-shoulders, bottom = shoulder + 0.7·(wrist − shoulder))
  → per-frame chest displacement = mean depth inside ROI
  → 1D respiration time series
  → scipy.signal.find_peaks → 4 respiratory keypoints
       (tidal start, tidal end, exhale start, exhale end)
  → regression model (DepthFVC, Height, Weight → FVC_liters)
       rescales depth curve to true volume
  → flow curve = np.gradient(volume, dt=0.1)
  → PFT panel: FVC, FEV1, FEV1/FVC, PEF, FEF25/50/75, FEF25–75
       overlaid live on the depth viewport
```

The codebase splits this into five Python modules (`realsense_manager.py`, `skeleton_tracking.py`, `patient_measurement.py`, `lung_measurement.py`, `user_control.py`) plus the `pipeline_master_v2.ipynb` driver — see the sections below for what each one actually does.

## 1. Hardware Capture (`realsense_manager.py`)

Wraps the **pyrealsense2** SDK behind a `DeviceManager` class. Per session:

- **Streams enabled:** depth (`z16`, 1280×720, 30 fps) + color (`bgr8`, 1280×720, 30 fps).
- **Six-stage post-processing chain** applied to every depth frame, in order:
  1. **Decimation filter** (`filter_magnitude = 2`) — downsample to suppress shot noise.
  2. **Disparity transform (forward)** — switch to disparity domain so subsequent filters work in the right metric space.
  3. **Spatial filter** — edge-preserving smoothing.
  4. **Temporal filter** — multi-frame averaging.
  5. **Disparity transform (backward)** — convert back to depth.
  6. **Hole-filling filter** — fills missing-depth pixels (sun glare, dark surfaces) with nearest valid neighbors.
- **Frame alignment** via `rs.align(rs.stream.color)` so each depth pixel has a matching color pixel.
- **Intrinsics + pixel-to-meters scaling** pulled live from the active depth sensor.
- **IR emitter toggle** so the operator can compare laser-projected vs. passive stereo depth quality per patient.
- **Playback support** for `.bag` recordings via `rs.config.enable_device_from_file` — the same code path runs live capture or recorded sessions, which is what made the offline pipeline notebooks possible against the same module.

## 2. Skeleton Tracking (`skeleton_tracking.py`)

Built on the **Cubemos Skeleton Tracking SDK** for 2D pose estimation on the color frame. Each frame produces an 18-keypoint skeleton (chin, both shoulders, elbows, wrists, hips, knees, ankles, eyes, ears).

The 3D keypoint coordinate for each 2D joint comes from RealSense itself:

- For each 2D joint `(x, y)`, sample the depth values inside a **5×5 pixel kernel** around it.
- Take the **median** of the kernel (suppresses single-pixel depth noise).
- If `median ≥ 0.3 m` and the joint confidence exceeds threshold (default `0.2`), call `rs.rs2_deproject_pixel_to_point(intrinsics, [x, y], median)` to get the metric `(X, Y, Z)` keypoint.

This 5×5-median trick is the key reason chest displacement signals stay clean despite the underlying RealSense depth noise floor — every per-joint depth value is already a small local consensus.

## 3. Real-Time Posture Quality Monitoring

For a contactless spirometry reading to be valid, the patient has to sit still. Five posture-quality checks run on every frame, each comparing the current skeleton to a **per-session baseline** captured when the operator hits the `b` key.

- **Rocking detection** — mean z (depth) of left shoulder, right shoulder, and neck-midpoint joints, compared to baseline; flagged if `|Δz| > 0.05 m`.
- **Side movement** — mean x of both shoulder joints; flagged if `|Δx| > 5 px`.
- **Shoulder lift** — mean y of both shoulder joints; flagged if `|Δy| > 5 px`.
- **Neck movement** — mean x of the 5 head joints (nose, both ears, both eyes); flagged if `|Δx| > 10 px`.
- **Leg position** — angle between knee and ankle for each leg, computed via right-triangle trigonometry; flagged if either leg is outside `[80°, 100°]` (i.e. not roughly perpendicular to the floor when seated).

Each flag renders a colored "Good" / "Bad" status overlay on the depth viewport in real time, so the operator can correct the patient mid-session rather than discovering motion-corrupted data after the fact.

## 4. Chest ROI + Displacement Signal (`patient_measurement.py`)

The chest displacement signal is the raw input to spirometry. The ROI for "chest" is constructed from skeleton keypoints, not learned:

```
roi_top    = max(y_left_shoulder, y_right_shoulder) − 10 px
roi_bottom = roi_top + 0.7 · (min(y_left_wrist, y_right_wrist) − roi_top)
roi_left   = x_right_wrist
roi_right  = x_left_wrist
```

This gives a tight rectangle covering the patient's anterior thorax — bounded by shoulders on top, by the 70%-down-to-wrists line on the bottom, and by the wrist x-positions on the sides. The 70% clip is intentional: it excludes the abdomen, which dominates the diaphragmatic component of breathing and would otherwise drown out the chest-wall signal.

Per frame, the **mean depth value inside that ROI** (in meters, after the 6-stage filter chain) is the chest-displacement scalar for that timestamp. The time series of these scalars is the 1D respiratory waveform that everything downstream operates on.

## 5. Per-Frame Physiological Measurements

In parallel with the displacement signal, four metric body measurements are computed and overlaid on the live viewport:

- **Chair-to-head height** — vertical distance from the seated knee-midpoint to the nose joint, in meters.
- **Chair-to-shoulder height** — same, but to the shoulder-midpoint.
- **Chest width** — horizontal distance between the left and right wrist x-positions at mid-chest y.
- **Shoulder width** — horizontal distance between the two shoulder joints.

All four use the same `rs2_deproject_pixel_to_point` deprojection, so distances are reported in real-world meters rather than pixels. These are useful both as patient-session metadata and as a sanity check on the depth calibration before a measurement run.

## 6. Respiratory Keypoint Detection (`lung_measurement.py`)

The 1D chest displacement curve needs to be segmented into respiratory phases before any spirometry parameter can be extracted. `compute_keypoints(vals)` does this in pure NumPy + SciPy:

- Run `scipy.signal.find_peaks` on the curve and on its negative, both with `distance = N / 10` to enforce a minimum separation between detected extrema.
- Identify four keypoints:
  - **Start of tidal breathing** — frame 0 of the recording.
  - **End of forced exhale** — the global maximum (peak chest position, occurs at full inhalation right after the blast).
  - **Start of forced exhale** — the deepest minimum *before* the global max (chest at minimum volume just before the blast).
  - **End of tidal breathing** — the peak nearest in time to the global max but still earlier than it (end of the relaxed-breathing segment).

These four indices define the exhalation segment that all downstream PFT calculations slice from.

## 7. Depth-to-Volume Calibration

Raw chest displacement is in meters of depth change, not liters of air. The conversion uses a per-patient regression model trained on paired Breathily-vs-spirometer recordings:

```python
# Inputs:  DepthFVC (chest displacement during forced exhale, in m)
#          Height   (cm)
#          Weight   (lb)
# Output:  predicted FVC in liters
lg = joblib.load('latest_model.pkl')
predictedFVC = lg.predict([[depthFVC, height, weight]])[0][0]

# Rescale the full chest-displacement curve to volume:
volume = (chest_displacement − chest_displacement[exhale_start])
         * (predictedFVC / depthFVC)
```

This is the calibration step that turns Breathily from a depth sensor into a volume sensor. The model is fit once on a corpus of paired sessions with the reference spirometer; at inference time it only needs the patient's height and weight plus the raw `DepthFVC` from the keypoint detector above.

## 8. PFT Parameter Computation

Given a volume curve (in liters) and its `np.gradient` flow curve (in L/s, `dt = 0.1` s), `compute_pft_measures(...)` extracts the full clinical panel:

| Metric | Definition (as computed in code) |
|---|---|
| **FVC** | `max(exhalation)` — forced vital capacity |
| **FEV1** | volume at a fixed frame offset from the start of forced exhale (the 1-second mark after downsampling) |
| **FEV1/FVC** | ratio of the two above |
| **PEF** | `max(flow)` — peak expiratory flow |
| **FEF25** | flow at the first frame where exhaled volume crosses 25% of FVC |
| **FEF50** | flow at the first frame where exhaled volume crosses 50% of FVC |
| **FEF75** | flow at the first frame where exhaled volume crosses 75% of FVC |
| **FEF25–75** | `(0.75·FVC − 0.25·FVC) / Δframes(FEF25 → FEF75)` — mean mid-expiratory flow |

All eight are reported live on the depth viewport during a measurement run and saved alongside the raw frame data for the session.

## Hardware Design

The hardware progressed from CAD sketches to a portable 3D-printed enclosure used in clinical sessions.

Design goals:

- Portable frame for field and lab use.
- Adjustable sensor positioning for patient alignment.
- On-device compute through Intel NUC hardware.
- Integrated touchscreen control for operators.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/breathily_hardware_sketch.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="380px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>CAD design</b>: enclosure sketch with LCD mount, tension nut mechanism, and component layout.
</div>

### Final Device

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/breathily_3d_printed_front.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="260px" zoomable=true %}
  </div>
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/breathily_3d_printed_side.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="260px" zoomable=true %}
  </div>
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/breathily_3d_printed_setup.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="260px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Front</b>: frame and mounting geometry. <b>Side</b>: tripod alignment and sensor position. <b>Setup</b>: full system with touchscreen and camera.
</div>

The final system is a custom 3D-printed enclosure housing the **Intel RealSense** camera on an adjustable post, an **Intel NUC** mini PC for vision processing, and an **Arduino-driven touchscreen** for technician control, with compartments for battery and storage.

## Clinical Study

Breathily was evaluated in an IRB-approved clinical study at the UCSF Adult Pulmonary Function Lab with simultaneous depth capture and spirometry.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/clinical_study_setup_cropped.png" class="img-fluid rounded z-depth-1" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Clinical setup</b>: patient spirometry and concurrent rear view of the Breathily capture system.
</div>

### Study Setup

Patients sat in front of the Breathily device while performing standard spirometry. The software monitored movement quality indicators (rocking, side movement, shoulder movement, neck movement, leg position) on every frame, and a real-time body mesh was reconstructed to estimate waist and chest circumference.

### Clinical Features Demonstrated

- Real-time quality checks for movement and posture.
- 3D full-body mesh estimation for circumference measurements.
- Multi-angle quality assessment from multiple camera viewpoints.
- Real-time PFT estimation with direct comparison to spirometer output.

## Evaluation

Correlation coefficient, RMSE, and MAE of Breathily-derived PFT values against a paired reference spirometer in the IRB-approved patient study at the UCSF Pulmonary Function Lab.

## Tech Stack

- **Language / runtime:** Python 3.
- **Depth sensing:** Intel RealSense (D-series) via `pyrealsense2`; 6-stage post-processing filter chain; depth-color alignment; intrinsics-driven metric deprojection.
- **Pose estimation:** Cubemos Skeleton Tracking SDK (2D); 3D via RealSense deprojection with 5×5-kernel median depth.
- **Numerics + signal processing:** NumPy, SciPy (`scipy.signal.find_peaks`, `np.gradient`), pandas.
- **Regression model:** scikit-learn / `joblib` (`latest_model.pkl` — Height + Weight + DepthFVC → predicted FVC).
- **Image processing:** OpenCV (frame manipulation + visualization overlays), scikit-image (Otsu thresholding, region properties for leg-position fallback).
- **Live UI:** OpenCV window + matplotlib breathing-graph rasterized into the OpenCV viewport for a single side-by-side display.
- **Hardware:** Intel RealSense depth camera, Intel NUC mini-PC, Arduino-driven touchscreen, custom 3D-printed enclosure.

## Links

📂 [Repo](https://github.com/hengfranklin/Breathily)
