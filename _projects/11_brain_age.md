---
layout: project
title: Brain age prediction (UCSF Sohn Lab)
description: 3D CNN that predicts perceived brain age from non-contrast head CT; the perceived-to-actual age discrepancy (PTAD) is regressed against a panel of systemic diseases via a logistic GLM.
img: assets/img/projects/brain_age_p3.png
importance: 6
category: cv-ml
affiliation: UCSF
date: 2018-11-01
date_display: Nov 2018 – Jun 2019
role: CV Scientist · UCSF Sohn Lab
---

## Overview

Non-contrast head CT carries far more information than the handful of biomarkers extracted in routine radiology reads. The perceived "age" of a brain on CT is one such latent signal, anecdotally tied to a patient's medico-social and genetic history but historically too weak and too subjective to act on. This project trains a **3D convolutional neural network** to predict brain age objectively from non-contrast CT, then uses the **perceived-to-actual age discrepancy (PTAD)** as a single per-patient feature to predict a panel of systemic diseases and conditions.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/brain_age_p3.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="320px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Volumetric inputs: eight per-volume regional renderings of a brain CT, illustrating the kind of volumetric structure the 3D CNN consumes. (Figure from a related volumetric-segmentation experiment; the primary model in this work is a unified 3D CNN over the preprocessed volume rather than a per-region pipeline.)
</div>

## Motivation

Numerous hidden imaging biomarkers live in head CT, but only a handful are routinely extracted in clinical practice. Perceived brain age on CT is widely variable across patients and has long been described, informally, as tracking with medico-social and genetic history. Existing manual or semi-quantitative biomarkers for this signal are weak-to-moderate at best and rarely operationalized. The goal here is to (1) train a CNN that objectively estimates perceived brain age from non-contrast CT, and (2) use the residual between predicted and actual age (the PTAD) as a compact biomarker for systemic disease prediction.

## Pipeline

```
DICOM head CT
  → select soft-tissue algorithm, axial series
  → resample to 1 mm slice thickness
  → window normalization (emphasize brain parenchyma)
  → resize to model input shape
  → custom 3D CNN regressor (2 FC layers, heavy regularization, MAE loss)
  → predicted brain age (years)
  → PTAD = predicted_age − actual_age
  → generalized linear model (logit link)
        univariate + multivariate against systemic-disease panel
  → per-condition odds: hypertension, diabetes,
                        hypercholesterolemia, polysubstance abuse
```

## 1. Cohort

- **n = 3,692** non-contrast head CT studies from **3,692 unique patients** at UCSF.
- **Date range:** March 2017 – March 2018.
- **One scan per patient:** when multiple studies were available, only the **earliest** study was retained. This deliberately minimizes contamination from post-surgical and post-hemorrhage follow-up scans, where the brain's appearance no longer reflects the patient's baseline state.

## 2. Preprocessing

A standard in-house preprocessing pipeline is applied to every study before it reaches the model:

1. **Soft-tissue algorithm, axial series selected.** The brain-parenchyma-optimized reconstruction kernel is the relevant series for perceiving parenchymal age, rather than the bone-kernel reconstruction.
2. **Resample to 1 mm slice thickness.** Brings heterogeneous acquisition protocols onto a common z-spacing so the 3D CNN sees consistent volumetric geometry across patients.
3. **Window normalization.** Intensity windowing targeted at brain parenchyma compresses the HU range into the dynamic range the network actually needs to learn from.
4. **Resize.** Spatial resize to the network's fixed input shape.

## 3. 3D CNN Brain Age Regression

A **custom 3D convolutional neural network** is trained as a regressor over continuous age in years.

- **Architecture:** custom 3D CNN with **two fully connected layers** at the head and **heavy regularization** throughout.
- **Loss:** **mean absolute error (MAE)** between predicted age and chronological age. MAE is preferred over MSE here because the per-patient residual itself (PTAD) is the downstream feature, and MAE training produces residuals on the same scale as the target.
- **Output:** a single scalar, predicted brain age per study.
- **Per-patient feature:** `PTAD = predicted_age − actual_age`. Positive PTAD = brain looks older than the patient; negative PTAD = brain looks younger.

## 4. Statistical Modeling: PTAD → Disease Panel

Once a PTAD value exists per patient, the relationship between PTAD and systemic conditions is modeled with a **generalized linear model (GLM) with a logit link function** (i.e. logistic regression), run in two modes:

- **Univariate analysis:** PTAD as the sole predictor of each condition, one model per condition.
- **Multivariate analysis:** PTAD alongside other available patient covariates, to assess whether PTAD carries information independent of standard risk factors.

Conditions evaluated:

- Hypertension
- Diabetes
- Hypercholesterolemia
- Polysubstance abuse
- and more

## Clinical Relevance

A deep-learning-based PTAD on brain CT successfully predicts a panel of systemic diseases and conditions. More broadly, multiple data-driven imaging biomarkers can be extracted from non-contrast brain CT to predict systemic disease, a useful adjunct to the standard radiological interpretation that surfaces signal present in the scan but not currently part of the routine read.

## Stack

- **Language / numerics:** Python (NumPy, SciPy).
- **Deep learning:** custom 3D CNN regressor trained with MAE loss and heavy regularization.
- **Statistical modeling:** logistic GLM (univariate + multivariate) via scikit-learn / statsmodels.
- **Medical imaging I/O:** in-house DICOM preprocessing pipeline (soft-tissue axial selection, 1 mm resampling, parenchymal windowing, resize).

## Links

Internal lab work (UCSF Sohn Lab). No public artifact at this time.
