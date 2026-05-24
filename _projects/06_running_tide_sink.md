---
layout: project
title: Carbon sink rate tracking
description: Computer vision pipeline that turns underwater imagery from custom ocean satellite buoys into per-batch sink rate equations for carbon verification. Frame quality filtering, instance segmentation of biomaterial, floating-vs-sinking classification by segmentation midpoint, exponential decay fitting.
img: assets/img/projects/running_tide_camlite_buoy.png
importance: 2
category: cv-ml
affiliation: Running Tide
date: 2022-03-01
date_display: 2022 – 2024
role: Computer Vision Engineer · Running Tide
---

## Overview

A computer-vision pipeline that converts raw underwater imagery from Running Tide's open-ocean **camera buoys** into empirical **sink rate curves**, the per-batch sinking trajectory of carbon-bearing biomaterial as it descends through the water column. The sink rate curve feeds the carbon-accounting pipeline that produces our ocean carbon removal credits, so the CV output has to be accurate, conservative, and traceable to specific source frames.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/p03_8.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="380px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Wood-chip detections (red boxes) from an underwater frame captured by a Running Tide camera buoy.
</div>

## The Imagery Source: Camera Buoys

The input to the CV pipeline is real-time underwater video relayed from a fleet of custom **ocean observation buoys** (we call them "Camlite") that we designed and built in-house. Each buoy is a self-contained drifter: solar-powered topside with the antenna and electronics, an underwater enclosure holding the **machine vision camera** and complementary biogeochemical sensors (fluorometers, accelerometers for wave dynamics and trajectory, sea-surface temperature, GPS), and a satellite uplink that streams high-resolution biogeochemical data and in-situ imagery in real time to mission control.

We deployed buoy constellations from Running Tide's Iceland base into the North Atlantic (first launches in December 2022 and January 2023) in partnership with the shipping company Eimskip. The system is designed to survive open-ocean storm conditions.

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

The buoy camera shoots continuous video of the water column below it. Frame quality varies with sea state, time of day, particulate load, and biofouling on the lens, so the pipeline has to handle everything from clean shots of falling wood chips to frames fully occluded by fog, bubbles, or zooplankton.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    <img src="{{ '/assets/img/projects/running_tide_buoy_cam.gif' | relative_url }}" class="img-fluid rounded z-depth-1 d-block mx-auto" style="max-height: 360px; width: auto;" alt="Buoy camera footage showing underwater conditions">
  </div>
</div>
<div class="caption">
  Actual underwater buoy camera footage that the CV pipeline ingests.
</div>

The same buoy can return clean, analyzable wood-chip frames one hour and unusable frames the next, so the pipeline has to separate the two automatically before anything downstream looks at the imagery.

<div class="row">
  <div class="col-sm-4 mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/running_tide_frame_good_1.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="260px" zoomable=true %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/running_tide_frame_good_2.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="260px" zoomable=true %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/running_tide_frame_good_3.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="260px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Good frames: clear water column, wood chips visible against the mesh background, threshold line readable.
</div>

<div class="row">
  <div class="col-sm-4 mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/running_tide_frame_bad_biofouling.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="260px" zoomable=true %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/running_tide_frame_bad_bubbles.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="260px" zoomable=true %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/running_tide_frame_bad_turbidity.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="260px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Bad frames the filter rejects: biofouling / kelp occluding the lens, wave-entrained bubbles, and high turbidity from particulate load.
</div>

## Why Sink Rate Matters

Running Tide's carbon-accounting framework rests on a per-batch **empirical sinking curve**: how fast does this specific deployment of biomaterial drop through the water column on its way to long-term sequestration on the seafloor? The carbon-removal claim per batch depends directly on that curve. Modeled estimates alone aren't sufficient, since the verification methodology explicitly requires **in-situ measurement** that's tied back to specific deployments and then folded into the data-assimilative ocean models that produce the final carbon accounting.

The CV pipeline is the in-situ measurement layer. Its output is a sink rate equation per batch, which is passed to the ocean model that produces the final carbon accounting.

## Pipeline

```
buoy camera video (streamed via satellite)
  → frame extraction
  → frame-quality filter:  AutoML CNN classifier  →  reject (fog / occlusion / bubbles / biofouling)
                                                  →  accept
  → instance segmentation:  Mask R-CNN  →  per-instance mask per biomaterial fragment
  → floating-vs-sinking classification:  object is floating if its segmentation midpoint
                                         is above a manually defined threshold, else sinking
  → per-frame metric:  % wood chips floating
  → daily aggregate:  average % floating across all accepted frames for that day
  → time series:  daily % floating vs. hours since deployment
  → curve fit:  exponential decay  f(x) = A · r^x + C  (smooths the curve, reduces outliers)
  → sink rate equation → ocean model
```

## 1. Frame Quality Filter

Open-ocean buoy footage is often noisy. Before any segmentation, each frame is run through an **AutoML-trained CNN classifier** that labels it as usable or not. Reject classes include fog (low-visibility water column), occlusion (biofouling on the lens, marine snow plumes), and bubbles (wave entrainment near the surface). The filter is deliberately conservative: losing borderline frames is fine because the downstream curve fit averages over many accepted frames, but letting through frames with confounding artifacts biases the measurement.

## 2. Instance Segmentation (Mask R-CNN)

Accepted frames are passed to a **Mask R-CNN** instance segmentation model trained on a hand-labeled corpus of ~2,000 underwater frames containing biomaterial fragments (primarily wood chips in the carbon-removal deployments).

Mask R-CNN was chosen over a simpler bounding-box detector because:

- The downstream metric is **pixel area**, and bounding boxes overestimate area for elongated or irregularly shaped fragments.
- Multiple fragments often overlap in the frame, and instance masks separate them cleanly, whereas a single semantic-segmentation mask conflates them.
- The fragment-level shape information surfaces as a side product for downstream phenotyping work.

<div class="row">
  <div class="col-sm-4 mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/running_tide_segmentation_1.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="320px" zoomable=true %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/running_tide_segmentation_2.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="320px" zoomable=true %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/running_tide_segmentation_3.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="320px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Mask R-CNN outputs across a range of conditions: sparse chips drifting against the mesh, dense rafts of chips clumped at the surface, and a mixed scene with both surface aggregates and individual chips mid-descent.
</div>

## 3. Floating-vs-Sinking Classification → Exponential Decay Fit

For each segmented object, we compute the midpoint of its mask. Each frame has a manually defined threshold line drawn across it. If a midpoint sits above that line the object is classified as **floating**, and if it sits below the line it's classified as **sinking**.

Per frame, this gives a single scalar: the **percent of wood chips floating**. Per-frame values are noisy, so we average across all accepted frames from the same day to produce one data point per day. The full deployment is then a time series of daily % floating vs. hours since deployment.

The series is fit to an **exponential decay**:

```
f(x)  =  A · r^x  +  C
```

The fit smooths the raw signal and reduces the impact of outlier frames. The resulting equation is the **sink rate** for that batch and is passed to the ocean model that produces the carbon accounting. The oceanography team reviews each fit before it's certified.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/running_tide_sink_rate_curve.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="420px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Example sink rate curve for one deployment. Each dot is a daily-averaged % floating value derived from segmentations across all accepted frames that day; the solid line is the exponential-decay fit. The fitted equation in the legend is the per-batch sink rate handed off to the ocean model.
</div>

## 4. Evaluation

- **Segmentation:** IoU and mAP on the held-out portion of the labeled frame corpus.
- **Sink-rate curves:** reviewed per batch by the oceanography team for biological plausibility; cross-checked against the buoy's accelerometer + GPS trajectory data and the data-assimilative ocean models that consume the same deployments.
- **Selection cost:** the frame-quality reject rate is itself a monitored metric. A sudden spike usually indicates a hardware problem (biofouling, lens damage) before it shows up anywhere else.

## Stack

- **Language / numerics:** Python (NumPy, SciPy, scikit-learn).
- **Frame filtering:** AutoML CNN classifier (Google Cloud AutoML Vision).
- **Segmentation:** Mask R-CNN, trained on a custom ~2,000-frame labeled corpus.
- **Curve fitting:** non-linear least-squares fit of exponential decay model to the daily-averaged % floating time series.
- **Orchestration:** Cloud Composer / Airflow DAGs for daily ingest + processing of new buoy footage.
- **Containerization:** Docker workers for reproducible, scalable inference on incoming streams.

## Related Sources

- 🛰️ [Running Tide deploys open-ocean satellites in the North Atlantic](https://runningtidexmason.webflow.io/blog-post/running-tide-deploys-open-ocean-satellites-in-north-atlantic): context on the buoy platform (Camlite, accelerometer, GPS) and the deployment program.
- 📊 [Quantification methodology](https://runningtidexmason.webflow.io/quantification): how the CV-derived sink-rate output feeds the broader carbon accounting and data-assimilative ocean models.
- 🎙️ [AGU Ocean Sciences Meeting 2024 abstract](https://agu.confex.com/agu/OSM24/meetingapp.cgi/Paper/1490631)
