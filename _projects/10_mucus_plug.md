---
layout: project
title: Mucus plug segmentation (UCSF Fahy Lab)
description: Image-processing pipeline that turns radiologist annotations on chest CT into 3D per-plug segmentations, anatomic airway localization, and modeled airflow-resistance metrics. Published in JCI Insight (2024).
img: assets/img/projects/mucus_graphical_abstract.jpeg
importance: 5
category: cv-ml
affiliation: UCSF
date: 2019-06-01
date_display: Jun 2019 – Mar 2020
role: CV Scientist · UCSF Fahy Lab
---

## Overview

A computer-vision pipeline for chest CT that converts sparse radiologist annotations into a dense, quantitative description of every mucus plug in the lung — segmented in 3D, localized to a specific airway branch and generation, and reduced to interpretable measures of plug burden and predicted airflow obstruction. The pipeline output drives the **Quantitative Assessment of Airway Mucus Plug Pathology (qAAMP)** framework published in *JCI Insight*.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/mucus_graphical_abstract.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="320px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Mucus plugs occlude airways, decreasing expiratory airflow and trapping air distally. The pipeline below produces the per-plug measurements that quantify this effect.
</div>

## Publication

📄 Huang BK, Elicker BM, Henry TS, Kallianos KG, Hahn LD, Tang M, **Heng F**, McCulloch CE, *et al.*, Woodruff PG, Fahy JV, for the NHLBI Severe Asthma Research Program (SARP). **"Persistent mucus plugs in proximal airways are consequential for airflow limitation in asthma."** *JCI Insight* 2024;9(3):e174124. [doi.org/10.1172/jci.insight.174124](https://insight.jci.org/articles/view/174124)

## Pipeline

```
DICOM CT volume
  → radiologist elliptical ROIs (per slice, per plug)
  → per-plug volumetric subset extraction
  → GK fuzzy clustering on intensity → binary plug segmentation
  → largest connected component selection
  → shape descriptors:  PCA length, cylinder-fit diameter, median HU, marching-cubes mesh
  → lobar parenchyma segmentation
  → airway segmentation:  region-growing ∪ CNN, largest contiguous component
  → airway centerline skeletonization → topology graph
        (branch points, segment length, local radius, generation, lobe, child links)
  → per-plug airway localization (nearest termination point, Euclidean)
  → plug map: { plug_id → (lobe, generation, length, diameter, volume, density) }
  → Gaussian mixture phenotyping (stubby / stringy)
  → flow network model → Resistance Score (RS)
  → voxel-to-airway assignment → Obstructed Lung Volume Percentage (OLVP)
  → longitudinal matching across baseline ↔ year-3 scans
  → qAAMP output bundle
```

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/mucus_fig1_pipeline.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="280px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 1.</b> Annotation + image-processing pipeline overview, and the per-plug length, diameter, and volume distributions it produces.
</div>

## 1. Input + Annotation

### CT acquisition

- DICOM volumes acquired with a standardized SARP-3 protocol after bronchodilator use.
- **Voxel spacing:** 0.5–0.7 mm in the axial plane, 0.5–0.6 mm between axial slices.
- **Visualization window** during annotation: width 1,200 HU, center 600 HU.

### Multi-reader annotation ingestion

Each plug is marked by a thoracic radiologist as a 2D **elliptical ROI** in a DICOM viewer (OsiriX), repeated across every axial slice the plug appears in. Each annotation contributes `(center_xy, width, height, slice_z, plug_label)`. Annotations sharing a `plug_label` form a single contiguous plug.

- **Two independent readers** per scan; discordant plugs adjudicated by a third reader.
- For year-3 scans, baseline plugs missed in the first pass were retroactively added by 4-reader consensus (34 plugs across the cohort).
- Total ingested: **12,476 elliptical annotations → 778 individual plugs** across 57 patients (baseline + year-3 scans).

## 2. Per-Plug Volumetric Segmentation

For each labeled plug, the pipeline extracts the elliptical ROI from every slice it appears in, stacks them into a volumetric subset, and runs **Gustafson–Kessel (GK) fuzzy clustering** on the voxel intensities. Fuzzy (rather than hard) clustering was chosen because plug boundaries exhibit partial-volume effects at the mucus / airway-lumen / parenchyma interface, and the GK variant's adaptive Mahalanobis distance handles the non-spherical intensity distribution of these tissue classes.

- Cluster count `k = 2`.
- Foreground = the cluster with the **higher mean radiodensity** (mucus is denser than air).
- Final plug volume = **largest contiguous foreground component** (connected-component filter on the binary mask).

## 3. Per-Plug Shape Descriptors

Each segmented plug produces:

- **Length** via PCA on the segmented voxel coordinates. With eigenvalues `λ_major > λ_min > λ_least`, plug length is estimated as `L = 4 · √λ_major` (the standard PCA-based long-axis estimator for elongated volumes).
- **Diameter** via least-squares fit of a 3D cylinder to the segmented plug surface.
- **Density** as the median Hounsfield-unit value of segmented voxels.
- **Volume** as the voxel count × voxel volume.
- **Surface mesh** via marching cubes, with a subsequent surface-smoothing pass for visualization.

## 4. Lung + Airway Tree Model

The clinical interpretation of a plug depends entirely on *where* in the airway tree it sits. A two-stage anatomic model gives every plug a precise tree location.

### Lung + airway segmentation

- **Lobar parenchyma** segmented per lobe with an established open-source method (one label per lobe).
- **Airway lumen** segmented by combining two methods and taking the voxel-wise union, then keeping the largest connected component:
  - **Region-growing** from a trachea seed — high precision on central airways, drops out in small branches.
  - **CNN-based segmentation** — better recall on small airways than region growing alone.

### Centerline + topology graph

The airway segmentation is **skeletonized** to a centerline, then converted into a graph where each node carries:

- centerline coordinates
- branch-point flag
- segment length and local radius
- airway generation (= bifurcations from trachea; trachea = generation 0)
- lobe assignment
- child-branch connectivity

**Airway termination points** are the most distal centerline nodes with no children — the locations downstream of which a plug occludes flow.

### Per-plug airway localization

For each segmented plug centroid, the pipeline finds the **nearest airway termination point** by Euclidean distance. The plug inherits that airway's lobe and its generation number is the bifurcation count from the trachea.

## 5. Phenotyping

The per-plug length distribution across the cohort is fit with a **Gaussian mixture model** (3 components, selected by Akaike information criterion). The two dominant components are separated at **12 mm**, defining:

- **Stubby:** ≤ 12 mm (n = 448, 58%)
- **Stringy:** > 12 mm (n = 330, 42%)

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/mucus_fig2_length_phenotypes.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="500px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 2.</b> Multimodal length distribution with a 12 mm Gaussian-mixture split between stubby and stringy plugs; per-patient volume composition by phenotype.
</div>

## 6. Anatomic Distribution

Plugging the per-plug `(generation, lobe)` tuples back into the airway tree produces a per-patient **airway mucus plug map**. Across the cohort, plugs concentrate in airway **generations 6–9** — typically 2–4 mm diameter.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/mucus_fig3_airway_location.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="300px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 3.</b> 3D rendering of plugs in a patient (left); airway mucus plug map showing each plug's lobe and generation (middle); cohort-wide plug-count distribution by airway generation with corresponding mean diameters (right).
</div>

## 7. Resistance Score (RS)

The airway tree is converted into a **network of resistive elements** under the Poiseuille approximation. Each airway segment `n` of length `Lₙ` and radius `rₙ` carries a resistance

```
Rₙ = 8 μ Lₙ / (π rₙ⁴)
```

with `μ` the dynamic viscosity of humidified air. The full network of flow and pressure equations is then solved to obtain `Rₐ`, the resistance of the **unplugged** tree under an applied pressure `ΔP`.

To model the plugged state, every terminal branch whose airway is occluded (per the plug map) has its flow forced to zero; the network is re-solved to obtain `Rₚ`. The plug burden's contribution to airway resistance is

```
RS = 100 · (Rₚ − Rₐ) / Rₐ
```

The pipeline failed to converge on RS for 3 of 97 scans (~3%); test–retest reproducibility of `Rₐ` between baseline and year-3 scans was Pearson `r = 0.72`.

## 8. Obstructed Lung Volume Percentage (OLVP)

Rather than going through a flow model, OLVP estimates how much of the *lung volume* sits behind a plugged airway. The pipeline performs a per-lobe nearest-airway-termination-point assignment for every parenchymal voxel — essentially a Voronoi partition over termination points constrained within a lobe (the per-lobe constraint prevents voxels from being assigned across a fissure).

- A subregion is labeled **obstructed** if its terminal airway has a plug.
- Per lobe: `OLVP = 100 · V_obstructed / V_lobe`
- Per patient: aggregated across the 5 lobes.

OLVP failed in 3 of 97 scans where lobar segmentation did not converge.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/mucus_fig6_resistance_score.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="600px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 6.</b> RS and OLVP definitions, distributions, and relationships with FEV₁ (cross-sectional and longitudinal) and with lobar functional small-airways disease.
</div>

## 9. Longitudinal Plug Tracking

For 43 patients with paired baseline + year-3 scans, plugs are matched across time by airway location (lobe + generation + nearest-termination-point identity), giving each plug a label of **persistent** (same airway both visits), **resolved** (baseline only), or **newly formed** (year-3 only). For matched persistent plugs, the change in length and volume between visits is computed directly from the per-plug shape descriptors.

- 580 baseline plugs vs. 619 year-3 plugs.
- 47% of plugs persistent in the same airway over 3 years.
- 81% of patients had ≥1 persistent plug.
- Stringy plugs persisted at significantly higher rates than stubby; upper-lobe more than lower-lobe.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/mucus_fig4_persistence.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="520px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 4.</b> Patient-level plug stats, persistence rates, length/volume change distributions, lobar and phenotype effects, and a Sankey + state-transition diagram of stubby ↔ stringy ↔ absent transitions.
</div>

## 10. Validation Against Lung Function

The downstream check: do the pipeline-derived measures actually correlate with patient lung function? Plug counts stratified by generation (using the airway-localization output of §4) correlate negatively with FEV₁ and FEF25–75 — and the effect is concentrated in **proximal plugs (generation ≤ 7)**.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/mucus_fig5_proximal_vs_distal.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="300px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 5.</b> Spearman correlations and SHAP attributions of plug count vs. FEV₁ / FEF25–75 by airway generation. Proximal plugs dominate.
</div>

The same effect surfaces in the per-plug Resistance Score (RS-per-plug): each proximal plug contributes more to total airway resistance than a distal plug does.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/mucus_fig7_rs_per_plug.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="300px" zoomable=true %}
  </div>
</div>
<div class="caption">
  <b>Figure 7.</b> RS per plug stratified by airway generation, and by overall plug burden.
</div>

## qAAMP Output Bundle

The pipeline's per-scan output is bundled as the **Quantitative Assessment of Airway Mucus Plug Pathology (qAAMP)** — a structured set of CT-derived biomarkers ready for use as clinical-trial endpoints:

| Category | Metrics |
|---|---|
| **Plug burden** | mucus segment score, mucus slice score, mucus plug count, total plug volume |
| **Per-plug shape** | length, diameter, volume (per plug + cohort averages), stubby / stringy phenotype label |
| **Anatomic** | airway mucus plug map (lobe, generation per plug) |
| **Integrated impact** | Resistance Score (RS), Obstructed Lung Volume Percentage (OLVP) |

## Cohort

Patient data drawn from the **NHLBI Severe Asthma Research Program (SARP-3)** multi-institutional cohort. 57 baseline patients meeting inclusion criteria, 43 with paired year-3 follow-up scans; total 97 scans analyzed.

## Stack

- **Language / numerics:** Python (NumPy, SciPy, scikit-learn, statsmodels).
- **Image processing:** custom GK fuzzy clustering implementation; PCA-based length estimator; least-squares cylinder fit; marching cubes + surface smoothing for mesh; region-growing airway segmentation; CNN-based small-airway segmentation (combined via voxel-wise union); centerline skeletonization with topology-graph construction.
- **Flow modeling:** Poiseuille resistive-network solver over the airway graph.
- **Annotation:** OsiriX DICOM viewer for radiologist ROI placement.

## Links

📄 [Paper (JCI Insight, 2024)](https://insight.jci.org/articles/view/174124)
