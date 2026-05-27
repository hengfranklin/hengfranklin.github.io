---
layout: project
title: Kelp phenotyping
description: Two generations of computer vision for measuring harvested kelp blades. V2 reconstructs individual blades in 3D through frame extraction, color correction, blade masking, COLMAP structure from motion, ArUco metric scaling, and convex-hull and bounding-box measurement. V1 measures whole plants in 2D with Faster R-CNN detection.
img: assets/img/projects/p11_1.png
importance: 1
category: cv-ml
affiliation: Running Tide
featured: true
date: 2022-09-01
date_display: 2022 – 2024
role: Computer Vision Engineer · Running Tide
---

## Overview

Computer vision systems we built at Running Tide, a carbon removal company that grew kelp off the coast of Maine, to automate phenotypic measurement of harvested samples. V2 (Polar Bear) reconstructs individual blades in 3D to recover shape, length, width, and volume in real-world units. V1 (Kelp Photobooth) came first and measures whole plants in 2D. This page leads with V2 because the 3D reconstruction work is where most of the engineering went.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_pointcloud.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="420px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Sparse point cloud of a single kelp blade reconstructed with COLMAP structure from motion. With ArUco scaling applied, hull volume is reported in cm³ and the oriented bounding box gives length, width, and thickness in cm.
</div>

## Why It Exists

Running Tide grew offshore kelp farms along the coast of Maine as part of its carbon removal program. Each harvest cycle produced thousands of samples, and we needed quantitative phenotype measurements (blade count, blade length and width, biomass proxies, volume) to track growth across buoys, strains, and conditions. Manual measurement with calipers and rulers did not scale.

V1 produced per-blade 2D statistics from overhead photos. Kelp blades are curved, so a flat 2D projection underestimates biomass. V2 reconstructs each blade in 3D to measure volume directly.

## V2: Polar Bear

A single blade hangs from a rotating fixture, an industrial camera on a rail captures video as the blade turns, and the pipeline reconstructs the blade in 3D. The rig is a controlled imaging booth:

- **LUCID Vision Labs TRI162S-C** high-resolution industrial RGB camera (GigE).
- A linear rail system for camera positioning.
- A 24-patch color calibration card fixed in the scene.
- An ArUco marker board fixed in the scene for scale recovery.
- Controlled interior lighting.
- A rotating fixture holding the blade, with adjustable rotation speed.
- Automatic upload of captures to Google Cloud Storage for downstream processing.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/p10_1.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="380px" zoomable=true %}
  </div>
</div>
<div class="caption">
  The Polar Bear imaging rig. Along the central column, top to bottom: the ruled ArUco target, the 24-patch color calibration card, the hanging blade fixture. On the right: the LUCID camera on its rail and vice mount.
</div>

We chose structure from motion over active depth sensing such as LiDAR or stereo. The imaging environment is controlled for lighting, rotation, and backdrop, which lets the pipeline optimize for dense feature matching across overlapping high-resolution stills. In a controlled setting, structure from motion produces comparable geometry at a fraction of the hardware cost.

## V2 Pipeline

```
video from LUCID camera (.avi)
  → frame extraction
  → color card detection and correction        (PlantCV)
  → background removal and blade masking        (multilevel Otsu + contour filter; on-land and underwater variants)
  → COLMAP feature_extractor + sequential_matcher + mapper
  → sparse point cloud
  → metric scaling from ArUco                   (aruco_estimator ray intersection)
  → statistical outlier removal, hanger crop, normals
  → convex hull, oriented bounding box, voxel grid
  → metrics: hull volume, bounding box length, width, thickness (cm, cm³)
  → metrics.csv

  (experimental side path: Metashape dense MVS + texturing for photorealistic renders)
```

The pipeline runs end to end as a `PolarBearAnalysis` class in `run_polar_bear.py`, with a development version in `automated_3d_reconstruction.ipynb`. The sections below follow the order the data moves through it.

## 1. Capture and Frame Extraction

The camera records a video as the blade rotates on the fixture. We extract frames from the raw `.avi` with OpenCV and sort them in capture order, which preserves the temporal ordering that the matcher relies on later.

Frame resolution is a tuning knob. We benchmarked input resolution against frame count and processing time, since higher resolution gives more features per image but slows feature matching and bundle adjustment, and lower resolution softens minor motion blur. Production downsamples each frame to half resolution (`resize_perc = 0.5`).

<div class="row">
  <div class="col-sm-4 mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_raw_frame.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="240px" zoomable=true %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_res_half.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="240px" zoomable=true %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_res_ninth.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="240px" zoomable=true %}
  </div>
</div>
<div class="caption">
  The same captured frame at full resolution, half resolution, and one-ninth resolution, each shown at the same display size so the loss of detail is visible. As resolution drops, the blade keeps its silhouette but loses the surface texture COLMAP uses to detect and match features. Production runs at half resolution.
</div>

## 2. Color Card Correction

The 24-patch color card sits in every frame. Using PlantCV, we detect the card in the first frame, treat that frame as the color reference, and compute a per-frame color transformation matrix that maps every later frame onto the reference. This holds appearance steady across the capture as lighting and exposure drift.

Color correction is gated behind a flag and is most useful for the dense photorealistic reconstruction and any color-based biological analysis. SIFT works on grayscale and is robust to illumination, so the sparse reconstruction itself depends on it less.

## 3. Background Suppression and Blade Masking

This step is what makes the reconstruction work. We isolate the blade and set every other pixel to zero before COLMAP sees the images.

The masking runs in three steps:

1. Convert the frame to grayscale and apply multilevel Otsu thresholding (2 classes on land, 3 classes underwater, since water adds an intermediate brightness band).
2. Find contours and filter them. On land, we keep contours whose centroid sits below a fixed row (`cY > 800`) so the color card mounted above the blade is dropped. Underwater, we keep the single largest contour.
3. Bitwise-AND the original frame with the resulting mask, so the blade keeps its original pixels and the background goes to zero.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_otsu_threshold.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="280px" zoomable=true %}
  </div>
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_blade_mask_final.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="280px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Multilevel Otsu threshold on a full-resolution frame, then the final blade mask after contour filtering. The color card region at the top and the fixture hardware are removed, leaving the blade and its stipe.
</div>

The reason this matters is the turntable geometry. Structure from motion assumes a rigid scene with a moving camera. When the blade rotates and the rig background stays put, the camera sees two motions at once: the static background and the rotating blade. COLMAP will lock onto the high-contrast static background and fail to place the blade correctly. Masking removes the background features, so COLMAP only sees the blade and reads its rotation as equivalent camera motion around a static subject. Masking also removes repeating or moving texture, such as water ripples and suspended particulate underwater, that would otherwise create false matches.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_masked_blade.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="280px" zoomable=true %}
  </div>
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_underwater_mask.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="280px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Background-suppressed frames passed to COLMAP. Left: an on-land capture. Right: the underwater variant, which uses 3-class Otsu and a largest-contour filter to handle the murkier scene.
</div>

## 4. Sparse Reconstruction with COLMAP

The masked frames go through three COLMAP stages: feature extraction, feature matching, and incremental mapping. Each stage carries configuration choices tuned for this rig.

**Feature extraction.** SIFT features on the GPU. We disabled the two accuracy-boosting options, affine shape estimation (`SiftExtraction.estimate_affine_shape 0`) and domain size pooling (`SiftExtraction.domain_size_pooling 0`). The scene is controlled and the viewpoint change between adjacent frames is small, so standard SIFT finds enough stable features and the disabled options save time.

**Feature matching.** We use the sequential matcher rather than exhaustive matching. The frames come from a video, so they are ordered, and sequential matching only compares each frame to its neighbors, which is linear in frame count instead of quadratic. The camera orbits the blade and returns to viewpoints it has already seen, so we enable vocabulary-tree loop detection (`SequentialMatching.loop_detection 1`, with `vocab_tree_flickr100K_words32K.bin`). The vocabulary tree finds overlapping frames that are far apart in capture order and closes the loop, which reduces drift around the orbit.

**Incremental mapping.** The mapper initializes from a strong image pair, registers images one at a time by solving each new pose, triangulates new points, and runs bundle adjustment to refine cameras and points together by minimizing reprojection error. We run global bundle adjustment on the GPU with parallel bundle adjustment (`Mapper.ba_global_use_pba true`) and bound its cost: global adjustment fires once the model grows by 20% in registered images or points (`ba_global_images_ratio 1.2`, `ba_global_points_ratio 1.2`), capped at 20 iterations and 3 refinements per pass.

Moving from the development notebook to the production worker, we changed several settings to trade a little precision for throughput:

- Disabled guided matching (`SiftMatching.guided_matching` from `1` to `0`), which skips a second epipolar-guided matching pass.
- Moved global bundle adjustment from the CPU solver to GPU parallel bundle adjustment, with the iteration and refinement caps above.
- Dropped the intermediate reconstruction snapshots (`Mapper.snapshot_images_freq 3`) we used to inspect runs.
- Moved from a local macOS COLMAP build to a Docker worker on CUDA 10.2 with COLMAP compiled from source, fed by captures landing in Google Cloud Storage.
- Ran at half resolution rather than full.

## 5. Metric Scaling from ArUco

Structure from motion from a single moving camera recovers geometry up to an unknown global scale, so the raw reconstruction has arbitrary units. We recover absolute metric scale from an ArUco marker of known physical size.

We generate `DICT_5X5_50` markers and fix them in the scene, and detect them with subpixel corner refinement (`CORNER_REFINE_SUBPIX`), which matters because corner accuracy sets scale accuracy. The `aruco_estimator` package then recovers the marker corners in 3D without searching the sparse cloud: it detects each corner in 2D in the registered images, casts a ray from each camera center through the detected corner using the pose COLMAP solved, and intersects those rays to place the corner in 3D. With the corners in 3D, it measures the reconstructed edge length, compares it to the known physical length, and scales the point cloud and camera translations by `known_size / measured_size`.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_aruco_tag.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="220px" zoomable=true %}
  </div>
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_aruco_detected.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="220px" zoomable=true %}
  </div>
</div>
<div class="caption">
  A generated 5×5 ArUco tag, and markers detected on the rig. Because the physical marker size is known, ray intersection across views recovers an absolute metric scale for the otherwise scale-ambiguous reconstruction.
</div>

## 6. Photorealistic Rendering with Metashape (Experimental)

The measurement geometry came from the COLMAP reconstruction. Separately, we experimented with Agisoft Metashape as a platform for producing photorealistic 3D model renders of the blades, through its dense multi-view stereo and texturing. This was an exploratory path for visualization and sat outside the production measurement pipeline, so its render outputs are not shown here. COLMAP anchored production because it is open source and scriptable, and Metashape offered higher-quality textured surfaces through its own licensed interface for presentation-quality models.

## 7. Geometry and Measurement

We load the reconstruction into Open3D and turn it into biological measurements:

1. Read the points from the COLMAP model.
2. Remove statistical outliers (`nb_neighbors = 10`, `std_ratio = 1`) to drop stray triangulated points.
3. Crop the hanger and fixture with an axis-aligned bounding box, since they reconstruct alongside the blade.
4. Estimate normals.
5. Build a voxel grid at 0.5% of the cloud's largest extent.
6. Compute a convex hull for volume, and an oriented bounding box for length, width, and thickness.
7. Write `metrics.csv`.

We use an oriented bounding box rather than an axis-aligned one because the blade lands in an arbitrary orientation in reconstruction space, so the oriented box recovers true dimensions. The convex hull volume is a consistent proxy: it overestimates for a thin curved blade, so it tracks growth well across samples without claiming to be exact volume.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_colmap_cloud.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="360px" zoomable=true %}
  </div>
</div>
<div class="caption">
  The COLMAP point cloud of a single blade, loaded into Open3D for measurement.
</div>

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_pca_align.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="320px" zoomable=true %}
  </div>
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_obb_measure.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="320px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Left: principal axes found on the blade cloud, used to align it before fitting a box. Right: the oriented bounding box (orange) around the blade, whose extents give length, width, and thickness. With ArUco scaling, these come out in cm and the hull volume in cm³.
</div>

## 8. Evaluation

We tracked reconstruction quality with two primary metrics, plus a biological check:

- **Reprojection error (bundle adjustment cost):** the per-point error in pixels when a 3D point is projected back into its source images. COLMAP reports this for the sparse model.
- **Fraction of registered images:** how many input frames COLMAP placed in the final model. A drop here signaled insufficient overlap, motion blur, or regions with few detectable features, and was the fastest signal that a capture had gone wrong.
- **Biological validation:** convex hull volume and bounding box dimensions were compared against hand measurements of the same physical blade.

## V1: Kelp Photobooth

The earlier system imaged whole plants from overhead and produced blade count, length, width, and area per plant.

### Rig

A warehouse shipping container converted into a controlled imaging booth: a long table with a white sheet as the background, a linear rail mounted to the roof, a DSLR on the rail facing straight down, controlled lighting, and a ruler in every frame for pixel-to-centimeter calibration. The rail moved the DSLR along the table so a full plant could be captured as a single high-resolution overhead image.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_overhead_plant.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="420px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Raw overhead image of a harvested whole plant. The stipe runs vertically and the blades fan out horizontally. The dark line on the left edge is the measurement tape used for calibration.
</div>

### Classical Pipeline

Our first pipeline applied classical computer vision to whole-plant photos:

```
DSLR overhead image
  → greyscale + Gaussian blur
  → adaptive Gaussian threshold (inverted binary)
  → morphological close (denoise)
  → connectedComponentsWithStats (filter small blobs)
  → skimage.skeletonize
  → branch point detection (mahotas, hit-or-miss kernels)
  → contours + ellipse fitting per blade
```

Branch-point detection on the skeleton produces a graph of the plant (stipe and blades), which yields the blade count. Per-blade contours produce shape statistics for each blade.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_skeleton.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="420px" zoomable=true %}
  </div>
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_ellipses.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="420px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Skeleton: <code>skimage.skeletonize</code> reduces the plant to a one-pixel-wide graph. The long vertical line is the stipe and the horizontal spurs are blades, and each junction is a branch point that yields the blade count. Per-blade ellipses: green ellipses fitted to each blade contour give area, length, and orientation.
</div>

A second variant handled photos where operators detached blades and laid them out separately, using `minAreaRect` on each contour to recover blade length and width.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_separated_blades_raw.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="320px" zoomable=true %}
  </div>
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_separated_blades_annotated.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="320px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Input: four blades on the white background. Output: rotated bounding box and ID per blade, yielding length, width, and area.
</div>

### Faster R-CNN Upgrade

The classical pipeline struggled with overlapping blades, varying lighting, and debris. We replaced the detection stage with **Faster R-CNN ResNet-101 v1 (1024)**, trained on a custom `kelp_blades_detection` dataset labelled in the TensorFlow Object Detection API format.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_frcnn_detections.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="420px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Faster R-CNN per-blade detections on a full overhead photo. The ruler tape on the left and the date label were captured in frame for calibration and provenance.
</div>

The full pipeline becomes:

```
overhead image
  → Faster R-CNN kelp blade detector (TF2 SavedModel)
  → per-detection bbox → crop
  → per-crop classical segmentation (threshold + denoise)
  → per-blade area and length, with pixel-to-cm calibration from the ruler
  → dataset-wide CSV export
```

The final CSV schema is `image_name | buoy_name | date_harvested | height_bbox | width_bbox | area | arc_length | farm_depth | blade_id | total_blade_count`. This fed downstream growth analyses per farm and per sampling date.

<div class="row">
  <div class="col-sm-4 mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_blade_crop.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="260px" zoomable=true %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_blade_mask.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="260px" zoomable=true %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_area_histogram.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="260px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Crop: single blade from a detection box. Mask: binary segmentation used for area and arc length. Dataset histogram: per-blade areas across all farms and dates.
</div>

## Stack

- **Vision and ML:** OpenCV, scikit-image, PlantCV (color card correction), mahotas (branch-point detection), TensorFlow 2 with the TF Object Detection API (Faster R-CNN ResNet-101 v1 1024) for V1, Monodepth2 (exploratory monocular depth for underwater captures where structure from motion failed on suspended particulate).
- **3D:** COLMAP (sparse structure from motion), Open3D, PyntCloud, trimesh, `aruco_estimator` and `colmap_wrapper` for absolute scale. Agisoft Metashape was experimented with separately for photorealistic dense renders.
- **Infrastructure:** NVIDIA CUDA 10.2, Docker for the COLMAP worker, Google Cloud Storage (camera to GCS to reconstruction worker), LUCID Vision Labs Triton TRI162S-C industrial RGB camera, linear rail systems for both V1 and V2.

## Related Sources

- 📂 [Repository](https://github.com/hengfranklin/kelp-phenotyping): scripts, notebooks, and rig notes for both generations.
- 📄 [NAPPN 2022 abstract](https://www.authorea.com/users/510851/articles/588338-nappn-annual-conference-abstract-computer-vision-based-phenotyping-approaches-in-the-brown-macroalgae-saccharina-latissima): computer-vision phenotyping approaches in the brown macroalgae Saccharina latissima.
