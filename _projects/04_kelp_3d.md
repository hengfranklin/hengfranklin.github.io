---
layout: project
title: Kelp phenotyping
description: Two generations of computer vision for measuring harvested kelp blades. Overhead 2D imaging of whole plants, then multi-view 3D reconstruction of individual blades.
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

Computer vision systems we built at Running Tide, a carbon removal company that grew kelp off the coast of Maine, to automate phenotypic measurement of harvested samples. V1 measures whole plants in 2D. V2 reconstructs individual blades in 3D.

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_frcnn_detections.png" class="img-fluid rounded z-depth-1" zoomable=true %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_pointcloud.png" class="img-fluid rounded z-depth-1" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>V1</b>: per-blade object detection on a whole plant under the overhead rig. <b>V2</b>: 3D point cloud of a single blade reconstructed with COLMAP.
</div>

## Why It Exists

Running Tide grew offshore kelp farms along the coast of Maine as part of its carbon removal program. Each harvest cycle produced thousands of samples, and we needed quantitative phenotype measurements (blade count, blade length and width, biomass proxies, volume) to track growth across buoys, strains, and conditions. Manual measurement with calipers and rulers did not scale, so we built two successive imaging rigs with matching computer vision pipelines.

## V1: Kelp Photobooth

Overhead imaging of whole kelp plants harvested from offshore buoys. Output: blade count, length, width, and area per plant.

### Rig

A warehouse shipping container converted into a controlled imaging booth:

- A long table running the length of the container, with a white sheet laid flat as the background.
- A linear rail mounted to the interior roof, running the length of the table.
- A DSLR camera attached to the rail, facing straight down.
- Controlled interior lighting.
- A ruler in every frame, used for pixel-to-centimeter calibration.

The rail moved the DSLR along the table so a full kelp plant could be captured as a single high-resolution overhead image. The operator laid a harvested plant on the table, the DSLR traversed and captured, and downstream processing ran from the saved images.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_overhead_plant.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="420px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Raw overhead image of a harvested whole plant. The stipe runs vertically and the blades fan out horizontally. The dark line on the left edge is the measurement tape used for pixel-to-centimeter calibration.
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

Branch-point detection on the skeleton produces a graph representation of the plant (stipe and blades), yielding the blade count. Per-blade contours produce shape statistics for each blade.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_skeleton.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="420px" zoomable=true %}
  </div>
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_ellipses.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="420px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Skeleton</b>: <code>skimage.skeletonize</code> reduces the plant to a one-pixel-wide graph. The long vertical line is the stipe; horizontal spurs are blades. Each junction is a branch point, which yields the blade count. <b>Per-blade ellipses</b>: green ellipses fitted to each blade contour give area, length, and orientation.
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
  <b>Input</b>: four blades on the white background. <b>Output</b>: rotated bounding box and ID per blade, yielding length, width, and area.
</div>

### Faster R-CNN Upgrade

The classical pipeline struggled with overlapping blades, varying lighting, and debris. We replaced the detection stage with **Faster R-CNN ResNet-101 v1 (1024)**, trained on a custom `kelp_blades_detection` dataset labelled in the TensorFlow Object Detection API format.

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_frcnn_detections.png" class="img-fluid rounded z-depth-1" zoomable=true %}
  </div>
</div>
<div class="caption">
  Faster R-CNN per-blade detections on a full overhead photo. The ruler tape on the left and the date label (3/30/22) were captured in frame for calibration and provenance.
</div>

The full pipeline becomes:

```
overhead image
  → Faster R-CNN kelp blade detector (TF2 SavedModel)
  → per-detection bbox → crop
  → per-crop classical segmentation (threshold + denoise)
  → per-blade area and length (from bbox), with px-to-cm calibration from the ruler
  → dataset-wide CSV export
```

Final CSV schema: `image_name | buoy_name | date_harvested | height_bbox | width_bbox | area | arc_length | farm_depth | blade_id | total_blade_count`. This fed downstream growth analyses per farm and per sampling date.

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_blade_crop.png" class="img-fluid rounded z-depth-1" zoomable=true %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_blade_mask.png" class="img-fluid rounded z-depth-1" zoomable=true %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/projects/v1_area_histogram.png" class="img-fluid rounded z-depth-1" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Crop</b>: single blade from a detection box. <b>Mask</b>: binary segmentation used for area and arc length. <b>Dataset histogram</b>: per-blade areas across all farms and dates.
</div>

## V2: Polar Bear

Multi-view imaging of individual blades and full 3D reconstruction to recover shape, length, width, and volume in real-world units. V1 produced per-blade 2D statistics, but kelp blades are not flat, so a 2D projection underestimates biomass. V2 reconstructs each blade in 3D.

### End-to-End Flow

```
video from LUCID camera (.avi)
  → frame extraction
  → color card detection and correction (plantCV)
  → background removal and blade masking (multilevel Otsu + contour filter, on-land and underwater variants)
  → COLMAP feature_extractor + sequential_matcher + mapper
  → sparse point cloud
  → optional absolute metric scaling from ArUco
  → optional Metashape dense reconstruction
  → statistical outlier removal, normals estimation
  → voxel grid, convex hull, oriented bounding box
  → metrics: hull volume, oriented bounding box length, width, thickness (cm, cm³)
  → metrics.csv
```

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/projects/p11_1.png" class="img-fluid rounded z-depth-1" zoomable=true %}
  </div>
</div>

### Rig

A different scene setup from V1. A single blade hangs from a fixture, with:

- **LUCID Vision Labs TRI162S-C** high-resolution industrial RGB camera (GigE).
- A linear rail system for precise camera positioning.
- A 24-patch color calibration card fixed in the scene.
- An ArUco marker board fixed in the scene for scale recovery (pixel-to-meter).
- Consistent, controlled interior lighting.
- A rotating fixture holding the blade, with adjustable rotation speed.
- Automatic upload of captures to GCS for downstream processing.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/p10_1.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="380px" zoomable=true %}
  </div>
</div>
<div class="caption">
  The Polar Bear imaging rig. From top to bottom along the central column: the ruled ArUco target, the 24-patch color calibration card, the hanging blade fixture. On the right: the LUCID industrial RGB camera on its rail and vice mount.
</div>

### Design Choice: SfM Over Active Depth Sensing

We chose Structure from Motion over active depth sensing (LiDAR or stereo). The imaging environment was controlled (lighting, rotation, backdrop), which let the pipeline optimize for dense feature matching across overlapping high-resolution stills. In a controlled setting SfM produces comparable geometry at a fraction of the hardware cost.

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_raw_frame.png" class="img-fluid rounded z-depth-1" zoomable=true %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_blade_bbox.png" class="img-fluid rounded z-depth-1" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Raw LUCID frame</b>: single blade on the fixture. <b>Detected bounding box</b>: computed with multilevel Otsu thresholding and contour filtering.
</div>

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_masked_blade.png" class="img-fluid rounded z-depth-1" zoomable=true %}
  </div>
</div>
<div class="caption">
  Background-suppressed frame passed to COLMAP. Feature matching degrades when the background contains repeating or moving texture, so everything outside the blade is set to zero.
</div>

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_aruco_tag.png" class="img-fluid rounded z-depth-1" zoomable=true %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_aruco_detected.png" class="img-fluid rounded z-depth-1" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Generated 5×5 ArUco tag</b>, and <b>detected on the rig</b>. Because the physical marker size is known, this recovers an absolute metric scale for the otherwise scale-ambiguous SfM reconstruction.
</div>

### 3D Pipeline

- **Sparse reconstruction (SfM):** [COLMAP](https://colmap.github.io/). SIFT feature extraction, sequential matcher with a vocabulary tree for loop detection, and an incremental mapper with global bundle adjustment.
- **Dense photorealistic point cloud:** [Agisoft Metashape](https://www.agisoft.com/), used for dense multi-view stereo and background removal.
- **Post-processing and geometry:** [Open3D](http://www.open3d.org/) for statistical outlier removal, voxel grids, convex hulls, and oriented bounding boxes; [PyntCloud](https://pyntcloud.readthedocs.io/) and [trimesh](https://trimsh.org/) for additional geometry.

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/projects/v2_pointcloud.png" class="img-fluid rounded z-depth-1" zoomable=true %}
  </div>
</div>
<div class="caption">
  Sparse point cloud produced by COLMAP for one blade. With ArUco scaling applied, hull volume is reported in cm³ and the oriented bounding box extents give length, width, and thickness in cm.
</div>

### Evaluation

Reconstruction quality was tracked with two primary metrics:

- **Reprojection error (bundle adjustment error):** the per-point error in pixels when a 3D point is reprojected back into its source images. COLMAP reports this for the sparse model.
- **Number of registered images:** the fraction of input images COLMAP placed in the final model. A drop here typically indicated insufficient overlap, motion blur, or regions with few detectable features.

Downstream biological measurements (convex hull volume, oriented bounding box dimensions) were validated against hand measurements of the same physical blade.

## Tech Stack

**Vision and ML:** OpenCV, scikit-image, PlantCV (color card correction), mahotas (branch-point detection), TensorFlow 2 with the TF Object Detection API (Faster R-CNN ResNet-101 v1 1024) for V1, Monodepth2 (exploratory monocular depth).

**3D:** COLMAP (sparse SfM), Agisoft Metashape (dense MVS, background removal), Open3D, PyntCloud, trimesh, `aruco_estimator` and `colmap_wrapper` for absolute scale.

**Infrastructure:** NVIDIA CUDA 10.2, Docker for the COLMAP worker, Google Cloud Storage (camera → GCS → reconstruction worker), LUCID Vision Labs Triton TRI162S-C industrial RGB camera, linear rail systems for both V1 and V2.

## Links

📂 [Repo](https://github.com/hengfranklin/kelp-phenotyping) · 📄 [NAPPN 2022](https://www.authorea.com/users/510851/articles/588338-nappn-annual-conference-abstract-computer-vision-based-phenotyping-approaches-in-the-brown-macroalgae-saccharina-latissima)
