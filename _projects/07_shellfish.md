---
layout: project
title: Robotic shellfish counter
description: Computer vision pipeline that counts ~1,000 shellfish per frame at 0.125 s/image on Running Tide's catamaran processing boat. Faster R-CNN with anchor box scales tuned for 2×2 px objects, with a custom small-object refinement pass.
img: assets/img/projects/shellfish_dawson_bins.jpg
importance: 3
category: cv-ml
affiliation: Running Tide
date: 2022-06-01
date_display: 2022
role: Computer Vision Engineer · Running Tide
---

## Overview

A computer-vision system for counting shellfish (primarily oysters) on Running Tide's harvesting platform, a custom catamaran processing boat where harvested stock is moved past a multi-camera rig. Each frame holds **~1,000 shellfish, some as small as 2×2 pixels** at sensor resolution, with a per-frame time budget of **0.125 s** to stay synchronized with the platform's throughput. The model is a Faster R-CNN with anchor scales tuned for that small-object regime, plus a custom post-processing pass that refines the smallest detections before they hit the counter.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/shellfish_dawson_bins.jpg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="320px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Oysters in the Dawson Metal stainless-steel bins. The bins flow past the camera rig during processing; their uniform background simplifies the segmentation and counting CV stack.
</div>

## The Imaging Platform

The CV system runs on **Running Tide's custom 60 ft × 24 ft oyster processing boat**, docked in Casco Bay (Harpswell, Maine). The boat is a catamaran with two 11 ft × 36 ft floating aluminum oyster reefs that drift into the centerline for harvest. Inside the processing deck a **distributed sensor + edge-compute setup** built on **~half a dozen Raspberry Pis** streams environmental telemetry (temperature, acidity, dissolved oxygen) to the cloud while the camera rig handles the high-rate counting.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/shellfish_processing_boat.jpg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="380px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Running Tide's 60 ft × 24 ft oyster processing catamaran (Casco Bay, ME). Two floating aluminum oyster reefs slot into the centerline for harvest; the processing deck above houses the camera rig and edge compute.
</div>

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/shellfish_raspberry_pi_controls.jpg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="360px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Wall of numbered control enclosures on the processing boat: the Raspberry Pi edge-compute stack that runs alongside the imaging system, handling environmental sensor ingestion and cloud relay.
</div>

### What the cameras see

Each oyster goes from the reef (where it grew) through stainless steel bins, past the camera rig, and on through the rest of the processing pipeline. The bins themselves were custom-fabricated by **Dawson Metal** in 18-gauge 316 stainless steel with a perforated bottom and single-piece construction, a design choice that minimizes welds and gives the camera rig a consistent, clean, non-confounding background.

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/projects/shelfish.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
  </div>
</div>
<div class="caption">
  Robotic shellfish counter: multi-camera view of the harvesting platform, with oysters identified per frame.
</div>

### Upstream context: the reefs

The 4-ton aluminum oyster reefs were built in-house at TechPlace (the former Brunswick Naval Air Station). Each reef has a propeller that circulates water across the stock so the oysters keep feeding even during slack tide, a design that produces a more predictable population density per harvest, which in turn keeps the CV pipeline's input distribution stable.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/shellfish_oyster_reef_build.jpg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="320px" zoomable=true %}
  </div>
</div>
<div class="caption">
  A 4-ton aluminum oyster reef under construction at TechPlace. Two of these float at each end of the processing catamaran.
</div>

## Pipeline

```
multi-camera frame  (high resolution, ~1,000 shellfish per frame, individuals as small as 2×2 px)
  → Faster R-CNN  (RPN → per-region classifier + box regressor)
        anchor scales tuned for small-object regime
  → custom small-object post-processing pass
        refines the smallest detections before counting
  → per-frame shellfish count
  → aggregate over the harvest stream
```

## 1. Detection: Faster R-CNN with Small-Object Anchors

We chose a 2-stage detector for this problem. Single-stage detectors (YOLO-family, SSD) are faster, but their default anchor grids don't cleanly cover the 2×2-pixel regime, and the dense small-object regime here is where the region-proposal stage of Faster R-CNN pays off:

- The **Region Proposal Network** can be configured with anchor scales / aspect ratios that match the actual size distribution of shellfish in the frame (heavily skewed to the small end).
- The **two-stage cascade** means small candidate boxes get a second pass of classification + regression, which is more forgiving on edge-case detections than a single feed-forward pass.

## 2. Small-Object Post-Processing

The smallest detections (~2×2 px) are noisy: at that scale a few pixels of motion blur, shadow, or sensor noise can produce a spurious box or merge two adjacent shellfish into one. A **custom post-processing pass** runs after Faster R-CNN's output:

- Per-detection confidence filtering with a scale-dependent threshold.
- Small-box NMS variant tuned for the dense-cluster regime (where default IoU NMS would over-suppress adjacent legitimate detections).
- Merge / split corrections for ambiguous adjacent boxes before the final count.

## 3. Throughput

The platform requires per-frame inference at **0.125 s** (~8 FPS) to keep pace with the harvest stream. The deployed Faster R-CNN, with its tuned anchor configuration and the post-processing pass, **hits >90% accuracy against human counts at that throughput**.

## 4. Evaluation

- **Detection metrics:** classification cross-entropy, bounding-box L1/L2 regression error.
- **End-to-end metric:** **absolute counting error** vs. human ground-truth counts on held-out frames. This is the metric the downstream operations team cares about, since the goal is total count per harvest run.

## Stack

- **Detection:** Faster R-CNN with tuned RPN anchor scales for small-object regime.
- **Post-processing:** custom scale-aware NMS and confidence filtering for dense small-object scenes.
- **Edge platform:** processing-boat hardware includes a distributed Raspberry Pi sensor + compute layer (environmental telemetry to cloud); the CV inference is the higher-compute consumer on this stack.
- **Fabrication:** custom 60 ft × 24 ft aluminum catamaran with two 11 ft × 36 ft floating oyster reefs (in-house, Brunswick Naval Air Station / TechPlace); Dawson Metal 316 stainless-steel growth bins.

## Related Sources

- 📰 [How a Half-Dozen Raspberry Pis Help Keep This Maine Oyster Farm Afloat](https://www.pcmag.com/news/how-a-half-dozen-raspberry-pis-help-keep-this-maine-oyster-farm-afloat): PCMag, 2020. Context on Running Tide's processing boat, reef design, and Raspberry Pi-based sensor stack.
- 🏭 [Dawson Metal: Shellfish Bins case study](https://www.dawsonmetal.com/case-studies/shellfish-bins): fabrication details for the 18ga 316 stainless steel oyster bins that flow through the imaging platform.
