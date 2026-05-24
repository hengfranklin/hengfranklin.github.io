---
layout: project
title: Carbon sink rate tracking
description: Computer vision pipeline that turns underwater imagery from custom ocean satellite buoys into per-batch sink rate curves for carbon verification. Frame quality filtering, instance segmentation of biomaterial, area-over-time decay fitting.
img: assets/img/projects/running_tide_camlite_buoy.png
importance: 2
category: cv-ml
affiliation: Running Tide
date: 2022-03-01
date_display: 2022 – 2024
role: Computer Vision Engineer · Running Tide
---

## Overview

A computer-vision pipeline that converts raw underwater imagery from Running Tide's open-ocean **camera buoys** into empirical **sink rate curves** — the per-batch sinking trajectory of carbon-bearing biomaterial as it descends through the water column. The sink rate curve is the verification primitive: it's what feeds the carbon-accounting pipeline that produces the company's ocean carbon removal credits, so the CV output has to be accurate, conservative, and traceable to specific source frames.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/p03_8.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="380px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Wood-chip detections (red boxes) from an underwater frame captured by a Running Tide camera buoy.
</div>

## The Imagery Source: Camera Buoys

The input to the CV pipeline is real-time underwater video relayed from a fleet of custom **ocean observation buoys** ("Camlite" in Running Tide's naming) that the company designed and built in-house. Each buoy is a self-contained drifter: solar-powered topside with the antenna and electronics, an underwater enclosure holding the **machine vision camera** and complementary biogeochemical sensors (fluorometers, accelerometers for wave dynamics + trajectory, sea-surface temperature, GPS), and a satellite uplink that streams high-resolution biogeochemical data and in-situ imagery in real time to mission control.

Buoy constellations have been deployed from Running Tide's Iceland base into the North Atlantic (first launches in December 2022 and January 2023) via partnership with the shipping company Eimskip, with the system designed to survive open-ocean storm conditions.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/running_tide_camlite_buoy.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="420px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Camlite camera buoys on deck before deployment. Solar panels and antenna topside; mesh enclosure protecting the underwater camera + sensor stack.
</div>

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/running_tide_sensor_body1.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="320px" zoomable=true %}
  </div>
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/running_tide_sensor_body2.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="320px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Custom underwater sensor enclosures developed in-house to house the machine-vision camera and biogeochemical instruments.
</div>

### What the camera actually sees

The buoy camera shoots continuous video of the water column below it. Frame quality varies dramatically with sea state, time of day, particulate load, and biofouling on the lens — the pipeline has to handle everything from clean shots of falling wood chips to frames fully occluded by fog, bubbles, or zooplankton.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    <img src="{{ '/assets/img/projects/running_tide_buoy_cam.gif' | relative_url }}" class="img-fluid rounded z-depth-1 d-block mx-auto" style="max-height: 360px; width: auto;" alt="Buoy camera footage showing underwater conditions">
  </div>
</div>
<div class="caption">
  Buoy camera footage — actual underwater video the CV pipeline ingests.
</div>

## Why Sink Rate Matters

Running Tide's carbon-accounting framework rests on a per-batch **empirical sinking curve**: how fast does this specific deployment of biomaterial drop through the water column on its way to long-term sequestration on the seafloor? The carbon-removal claim per batch depends directly on that curve. Modeled estimates alone aren't sufficient — the verification methodology explicitly requires **in-situ measurement** that's tied back to specific deployments, then folded into the data-assimilative ocean models that produce the final carbon accounting.

The CV pipeline is the in-situ measurement layer. The output isn't "this is a wood chip" — it's "wood chip surface area in the camera frame at time `t`" across the full descent, fit to an exponential decay model whose parameters become the sinking curve for that batch.

## Pipeline

```
buoy camera video (streamed via satellite)
  → frame extraction
  → frame-quality filter:  AutoML CNN classifier  →  reject (fog / occlusion / bubbles / biofouling)
                                                  →  accept
  → instance segmentation:  Mask R-CNN  →  per-instance binary mask per biomaterial fragment
  → per-frame metric:  sum of segmented pixel area
  → per-batch time series:  area(t) across all accepted frames
  → curve fit:  exponential decay  area(t) = A₀ · exp(-k · t)
  → sink rate parameters → carbon verification dashboard
```

## 1. Frame Quality Filter

Open-ocean buoy footage is noisy by default. Before any segmentation, each frame is run through an **AutoML-trained CNN classifier** that labels it as usable or not. Reject classes include fog (low-visibility water column), occlusion (biofouling on the lens, marine snow plumes), and bubbles (wave entrainment near the surface). The filter is deliberately conservative — losing borderline frames is fine because the downstream curve fit averages over many accepted frames, but letting through frames with confounding artifacts biases the area measurement.

## 2. Instance Segmentation (Mask R-CNN)

Accepted frames are passed to a **Mask R-CNN** instance segmentation model trained on a hand-labeled corpus of ~2,000 underwater frames containing biomaterial fragments (primarily wood chips in the carbon-removal deployments).

Mask R-CNN was chosen over a simpler bounding-box detector because:

- The downstream metric is **pixel area, not count** — bounding boxes overestimate area for elongated or irregularly shaped fragments.
- Multiple fragments often overlap in the frame; instance masks separate them cleanly, whereas a single semantic-segmentation mask conflates them.
- The fragment-level shape information surfaces as a side product for downstream phenotyping work.

## 3. Per-Batch Area Time Series → Exponential Decay Fit

The per-frame total segmented area becomes a single scalar per timestamp. Across the full descent window for a given deployment, the scalar series is fit to an **exponential decay**:

```
area(t)  =  A₀ · exp(-k · t)
```

The decay constant `k` (and its uncertainty) is the **sink rate** for that batch. Both parameters are passed downstream to the carbon-verification dashboard. The oceanography team reviews each fit before it's certified for use in the carbon accounting.

## 4. Evaluation

- **Segmentation:** IoU and mAP on the held-out portion of the labeled frame corpus.
- **Sink-rate curves:** reviewed per batch by the oceanography team for biological plausibility; cross-checked against the buoy's accelerometer + GPS trajectory data and the data-assimilative ocean models that consume the same deployments.
- **Selection cost:** the frame-quality reject rate is itself a monitored metric — a sudden spike usually indicates a hardware problem (biofouling, lens damage) before it shows up anywhere else.

## Stack

- **Language / numerics:** Python (NumPy, SciPy, scikit-learn).
- **Frame filtering:** AutoML CNN classifier (Google Cloud AutoML Vision).
- **Segmentation:** Mask R-CNN, trained on a custom ~2,000-frame labeled corpus.
- **Curve fitting:** non-linear least-squares fit of exponential decay model to per-frame area time series.
- **Orchestration:** Cloud Composer / Airflow DAGs for daily ingest + processing of new buoy footage.
- **Containerization:** Docker workers for reproducible, scalable inference on incoming streams.

## Related Work

- 🛰️ [Running Tide deploys open-ocean satellites in the North Atlantic](https://runningtidexmason.webflow.io/blog-post/running-tide-deploys-open-ocean-satellites-in-north-atlantic) — context on the buoy platform (Camlite + Accel + GPS) and the deployment program.
- 📊 [Quantification methodology](https://runningtidexmason.webflow.io/quantification) — how the CV-derived sink-rate output feeds the broader carbon accounting + data-assimilative ocean models.
- 🎙️ [AGU Ocean Sciences Meeting 2024 abstract](https://agu.confex.com/agu/OSM24/meetingapp.cgi/Paper/1490631)
