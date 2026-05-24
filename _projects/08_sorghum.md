---
layout: project
title: Crop stem width phenotyping
description: In-situ stem width phenotyping pipeline for corn and sorghum from RGB + depth on a moving robot. Faster R-CNN detection, morphological boundary modeling, RANSAC line fits, and depth-based metric conversion. Published in Electronic Imaging (SPIE 2018/2019).
img: assets/img/projects/p06_2.png
importance: 8
category: cv-ml
affiliation: UC Berkeley
date: 2017-05-01
date_display: May 2017 – Jan 2019
role: CV Researcher · UC Berkeley
---

## Overview

A computer-vision pipeline for measuring stem width of biofuel plants (corn and sorghum) directly in the field, from RGB + depth images captured by a stereo camera mounted on a mobile robot traversing rows. The system isolates individual stems with a CNN detector, models each stem's boundary with classical edge processing + RANSAC line fits, filters out low-confidence cases, and converts pixel width to metric width using paired depth data — designed to characterize stem-width distributions per plot (genetic strain) at scale.

## Publication

📄 Sahiner A, **Heng F**, Balamurugan A, Zakhor A. **"In Situ Width Estimation of Biofuel Plant Stems."** *Electronic Imaging* 2019. [Paper PDF](https://www-video.eecs.berkeley.edu/papers/asahiner/sahiner-stem-width-spie-2018.pdf) · [Conference page](https://library.imaging.org/ei/articles/31/13/art00009)

## Sensor Setup

The capture rig is an **Intel RealSense R200** stereo camera (RGB + IR + stereoscopic depth) mounted on a wheeled robot that traverses the 75 cm gap between two crop rows of a 3 m × 3 m plot containing ~50 plants of one genetic strain. RGB + depth frames are captured at a fixed rate as the robot moves. Each plot is one genotype — the downstream goal is a per-plot **histogram of stem widths**, not per-plant tracking, so the pipeline favors high precision per estimate over perfect recall.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/sorghum_fig1_robot.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="380px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 1.</b> Sensor setup. The robot moves down the inter-row gap with the stereo camera looking sideways into the crop row; sensor FOV covers a 3 m × 3 m plot of ~50 plants.
</div>

## Pipeline

```
RGB frame   ─┐
             ├─→  Stem Detection  →  Major Axis Estimation  →  Pixel Width Estimation  →  Stem Discarding  →  Metric Width Estimation  →  width estimate
Depth frame ─┘    (Faster R-CNN)     (Wiener + Canny             (fine morph closing       (parallelism            (depth + focal length)
                                      + coarse morph closing      + perpendicular probes    angle threshold)
                                      + connected-component       + RANSAC line fit
                                      selection)                   per side)
```

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/sorghum_fig2_pipeline.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="200px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 2.</b> Block diagram of the proposed approach. RGB feeds the detection + width pipeline; depth feeds only the final metric conversion step.
</div>

## 1. Stem Detection (Faster R-CNN)

Each RGB frame may contain several stems plus heavy leaf clutter. **Faster R-CNN with ResNet-101** (fine-tuned from a pretrained checkpoint on **2,000 hand-labeled corn + sorghum images**) proposes bounding boxes around individual stems with associated confidence scores. The detector's two-stage design — region proposal network + classifier — gives clean per-stem crops despite the dense, overlapping leaves in plot imagery.

Each detection produces a cropped RGB patch and the matching cropped depth patch, which both flow into the rest of the pipeline. Frame-to-frame stem tracking is deliberately skipped: because the same stem may appear in adjacent frames, duplicate detections exist, but for the per-plot histogram goal those duplicates do not bias the mean stem-width estimate appreciably.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/sorghum_fig3_frcnn_detections.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="420px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 3.</b> Faster R-CNN per-stem detections on an in-situ corn frame.
</div>

## 2. Major Axis Estimation

Within each stem crop, the algorithm needs a stable estimate of the stem's centerline and orientation before it can measure width. The chain:

1. **Adaptive Wiener filter** to denoise (suppresses speckle without blurring edges).
2. **Histogram equalization** to boost local contrast.
3. **Canny edge detector** for an edge profile that favors connected contours over isolated points.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/sorghum_fig4_preproc.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="280px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 4.</b> (a) Detection crop. (b) After Wiener denoise + contrast equalization. (c) Canny edge profile.
</div>

4. **Coarse morphological closing** on the binary edge image with a large `30 × 15` rectangular structuring element to extract big structures and suppress small leaf fragments.
5. **Connected-component selection** of the dominant stem region. Each candidate is scored by a weighted average of three features — area, distance from image center, and angular alignment to vertical — under the prior that the stem is the largest near-vertical structure near the center of the crop. The highest-scoring component is taken as the stem.
6. The selected component's **principal orientation** gives the stem's major axis line.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/sorghum_fig5_major_axis.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="240px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 5.</b> (a) Canny edge profile. (b) Coarse morphological closing isolates large structures. (c) Selected connected component + overlaid major axis.
</div>

## 3. Pixel Width Estimation

Coarse morphology was tuned to find the stem; for the actual boundary, a **finer morphological closing** with a smaller `12 × 4` structuring element is run to keep edge detail. Along the major axis, the algorithm samples points at equidistant spacing and **shoots perpendicular probe lines** out from the axis. The first edge crossing on each side at each probe gives a candidate boundary point.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/sorghum_fig6_perpendicular.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="280px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 6.</b> (a) Canny edge profile along the stem region. (b) After fine-resolution morphological closing. (c) Perpendicular probe lines along the major axis.
</div>

Each side's candidate points typically include outliers from leaves and occluders. **RANSAC** is run independently on the left and right point sets — fitting a line per side and rejecting outliers — because corn and sorghum stems are essentially straight over the visible segment. RANSAC was chosen over a Hough transform for both speed and accuracy on noisy line-fitting tasks of this kind (cited in the paper).

```
pixel_width = mean( perpendicular distance between the two RANSAC lines )
```

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/sorghum_fig7_ransac.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="200px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 7.</b> (a) Candidate boundary points. (b) RANSAC lines overlaid on the fine morphological profile. (c) Final boundary lines on the original RGB crop.
</div>

## 4. Confidence Filter

Real stems should have **near-parallel sides**. The angle between the two RANSAC-fit lines is a cheap, principled confidence signal: if it exceeds **5°**, the estimate is discarded. This rejects most cases corrupted by motion blur, leaf occlusion, or detection-box misalignment. Because the downstream consumer is a per-plot histogram (50 plants per row × 6 rows in the corn dataset), dropping low-confidence frames does not appreciably bias the mean.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/sorghum_fig8_discard.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="260px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 8.</b> (a) Blurry stem image. (b) Noisy Canny profile. (c) RANSAC lines diverge well beyond 5° → discarded.
</div>

## 5. Metric Width Estimation

Converting pixel width to metric width requires (i) the camera's focal length, (ii) the per-pixel depth to the stem, and (iii) an aligned RGB-depth pair. In practice, the RealSense RGB and depth streams are offset on the sensor and the offset varies with robot speed, so a **manual constant shift** is applied per dataset to register depth onto RGB.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/sorghum_fig9_depth_rgb.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="280px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 9.</b> (a) RGB image of two stems. (b) Corresponding depth heat map. The vertical stripes in the depth map are the stems; the depth stream is shifted left of the RGB stream, motivating the manual alignment step.
</div>

Once aligned, depth values for all pixels inside the segmented stem boundary are averaged to produce a single distance `d`. The metric width is then:

```
w_m = w_p · d / f_x
```

where `w_m` is the metric width, `w_p` is the pixel width, `d` is the depth to the stem, and `f_x` is the camera's focal length in pixels.

## 6. Datasets + Ground Truth

Two evaluation datasets:

- **In-situ corn** (pixel-only ground truth): 6 plots of 50 plants each in outdoor conditions. Pixel ground truth was hand-labeled at three locations along each detected stem and averaged. Metric ground truth was not collected because manual measurement on hundreds of in-field plants was infeasible.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/sorghum_fig10_pixel_gt.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="380px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 10.</b> Pixel-domain ground-truth labeling on an in-situ corn stem. Three red lines mark the locations where pixel width was measured; the three values are averaged.
</div>

- **Phantom sorghum** (pixel + metric ground truth): 5 phantom sorghum plants in 117 outdoor frames. Metric ground truth was acquired with **caliper measurements** at three points along each stem.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/sorghum_fig11_phantom_sorghum.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="320px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 11.</b> Phantom sorghum plants captured by the stereo camera.
</div>

## 7. Results

| Dataset | Domain | Estimates | Discard Rate | Avg % Absolute Error |
|---|---|---|---|---|
| Corn (in situ) | Pixel | 153 / 531 | 71% | **13.5%** |
| Phantom sorghum | Pixel | 149 / 390 (manually matched: 241) | 62% | **14.7%** |
| Phantom sorghum | Metric | 149 / 390 | 62% | **13.2%** |

The discard rate is high by design — the confidence filter is aggressive. Even on Plant 2 in the phantom sorghum dataset, where only **1 of 33** detections survived the filter, that single estimate was accurate, supporting the design choice that per-plot histograms tolerate aggressive filtering.

A notable result: most of the residual error sits in **pixel-width estimation**, not depth conversion. Comparison against the per-stem ground-truth variability (4–8% variation along the same stem from caliper measurements) suggests a significant fraction of pipeline error is at the floor of physical measurement noise.

## 8. Failure Modes

The dominant failure mode is **major-axis misestimation under heavy leaf occlusion** — when a leaf covers a large fraction of the stem in the detection crop, coarse morphological closing keeps the leaf as the dominant connected component and the axis is fit to the wrong structure.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/sorghum_fig12_leaf_occlusion.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="260px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 12.</b> Plant 2 with an occluding leaf on the right side, and its coarse morphological representation — the leaf is selected as the dominant structure, corrupting axis estimation.
</div>

The paper flags two natural extensions: (i) replace the classical edge + morphology boundary modeling with a **learned segmentation network**, and (ii) replace manual RGB-depth shift with **automated alignment**.

## Stack

- **Language / numerics:** Python (NumPy, SciPy, scikit-image, scikit-learn).
- **Detection:** Faster R-CNN with ResNet-101 backbone, fine-tuned on 2,000 hand-labeled corn + sorghum images.
- **Image processing:** Wiener filter (denoise), histogram equalization (contrast), Canny edge detection, multi-scale morphological closing (`30×15` coarse, `12×4` fine), connected-component analysis, RANSAC line fitting (per side, independent).
- **Geometry:** principal-component orientation for major axis; perpendicular-probe sampling for boundary points; pinhole-camera depth-to-metric conversion.
- **Hardware:** Intel RealSense R200 stereo camera (RGB + IR + stereo depth) on a wheeled robotic platform.

## Links

📄 [Paper (SPIE Electronic Imaging)](https://library.imaging.org/ei/articles/31/13/art00009)
