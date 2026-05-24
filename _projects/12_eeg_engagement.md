---
layout: project
title: EEG engagement decoding (UCSF Abbasi Lab)
description: Signal-processing pipeline for decoding attentional engagement from 64-channel EEG. Morlet wavelet time-frequency analysis, non-negative matrix factorization for interpretable pattern extraction, scalp-topography analysis, and cross-validated classification via NMF reconstruction.
img: assets/img/projects/nmf_eeg_p16.png
importance: 7
category: cv-ml
affiliation: UCSF
date: 2019-11-01
date_display: Nov 2019 – Jun 2020
role: CV Scientist · UCSF Abbasi Lab
---

## Overview

A signal-processing pipeline for decoding attentional engagement from raw 64-channel EEG. The chain runs from per-channel time-series → time-frequency spectrograms via Morlet wavelet transform → **non-negative matrix factorization (NMF)** that decomposes the spectrograms into a small set of additive pattern–coefficient pairs whose coefficient vectors map directly back onto scalp topography. The same factorization is then re-used as a cross-validated classifier — given a held-out trial, solve for its coefficient vector under the learned pattern dictionary and classify by correlation similarity.

## Pipeline

```
64-channel EEG (channels × time × trials)
  → global thresholding (noise removal)
  → trial-label split: Engaged vs. Non-Engaged
  → per-trial, per-channel Morlet wavelet transform → time-frequency spectrograms
  → per-class NMF:  X  ≈  W · H   (additive, non-negative)
        H = principal patterns  (17758 × 16 — time × frequency × channel features)
        W = coefficients per trial  (16 × 128)
  → coefficient sorting by time / frequency
  → coefficient → scalp topography mapping (per-pattern, per-class)
  → cross-validated classification:
        train  →  factorize X_train into (W_train, H_train)
        test   →  solve W' = f(X_test, H_train) under non-negativity (LARS / Lasso)
        score  →  correlation between W' and W_train per class
```

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/eeg_pipeline.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="520px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Current pipeline. <b>Preprocessing</b>: global thresholding for noise removal, Engaged / Non-Engaged trial split, Morlet wavelet transform to spectrograms. <b>Decomposition</b>: NMF applied per class. <b>Interpretation</b>: pattern sorting (time / frequency), scalp topography visualization, correlation-based classification.
</div>

## 1. Input: 64-Channel EEG

- **Signal:** 3D tensor `channels × time × trials`.
- **Acquisition:** 64-channel EEG system, time-locked to trial onset.
- **Labels:** Engaged vs. Non-Engaged per trial. The dataset is **strongly imbalanced** toward Engaged trials.
- **Auxiliary:** per-trial response time available as a secondary regression target.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/eeg_data_summary.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="280px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Data summary: 64-channel EEG, trial-aligned, with binary engagement labels and per-trial response-time metadata.
</div>

## 2. Preprocessing

A global intensity threshold removes high-amplitude artifacts (movement, electrode pop) before any time-frequency analysis. Trials are then split by label into two parallel streams (Engaged / Non-Engaged) that are factorized independently — keeping the per-class structure visible in the decomposed patterns rather than washed out by an aggregated fit.

## 3. Morlet Wavelet Transform

Each per-channel, per-trial time series is mapped to a **time-frequency spectrogram** via continuous wavelet transform with a **Morlet (complex Gaussian-modulated sinusoid)** mother wavelet. Morlet was chosen because it gives a tunable joint time-frequency localization: narrow Gaussian envelope = sharp temporal events; wider envelope = better frequency resolution. EEG engagement signatures live across multiple bands (alpha, beta, theta) with onsets at different latencies, so a wavelet basis is better suited than a fixed-window STFT.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/eeg_morlet_wavelet.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="320px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Morlet wavelet — a complex sinusoid modulated by a Gaussian envelope. Time-frequency localization is set by the envelope's width parameter.
</div>

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/eeg_spectrograms.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="560px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Per-channel Morlet spectrograms for Engaged trials (top) and Non-Engaged trials (bottom), 64 channels each. The cross-class structural differences these spectrograms expose are what the NMF stage is asked to decompose into a small basis.
</div>

## 4. Non-Negative Matrix Factorization

The spectrograms are stacked into a single non-negative matrix `X` per class, and factorized as

```
X  ≈  W · H,    W ≥ 0,   H ≥ 0
```

where `H` (`17758 × 16`) holds **16 principal time-frequency-channel patterns** as rows and `W` (`16 × 128`) gives the **per-trial coefficient weights** for combining those patterns. Rank `k = 16` was the dictionary size used.

NMF was chosen over PCA or ICA because its **additive, non-negative** constraint produces parts-based decompositions that align with how power spectra physically combine, and the resulting coefficient vectors are directly interpretable as "how strongly does pattern P_i express in this trial" — which is what the downstream scalp-topography mapping needs.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/eeg_nmf_decomposition.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="220px" zoomable=true %}
  </div>
</div>
<div class="caption">
  NMF decomposition. The original spectrogram matrix <code>X</code> is approximated as the product of a non-negative pattern matrix <code>H</code> and a non-negative coefficient matrix <code>W</code>.
</div>

### Reconstruction fidelity

Across the dictionary, NMF reconstructions match the original spectrograms with **average correlation 0.99** — confirming that 16 patterns are sufficient to capture the dominant structure in the time-frequency representation.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/eeg_nmf_reconstructions.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="540px" zoomable=true %}
  </div>
</div>
<div class="caption">
  NMF reconstructions vs. original Morlet spectrograms. Average reconstruction correlation across trials: 0.99.
</div>

### Patterns and coefficients

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/eeg_h_patterns.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="520px" zoomable=true %}
  </div>
</div>
<div class="caption">
  The 16 principal patterns of the <code>H</code> matrix, sorted by dominant frequency / time signature.
</div>

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/eeg_w_coefficients_engaged.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="180px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Coefficient strip — Engaged trials. Each column is a trial; row intensity is the strength of pattern <code>P_i</code> in that trial.
</div>

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/eeg_w_coefficients_nonengaged.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="180px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Coefficient strip — Non-Engaged trials.
</div>

## 5. Coefficient Analysis (Scalp Topography)

The factorization produces 16 patterns per class, each with a corresponding coefficient distribution over 64 electrodes. Plotting each pattern's coefficients in scalp coordinates produces a **topography map** that exposes which brain regions activate that pattern — a key advantage of NMF over latent decompositions whose components have no direct spatial interpretation.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/eeg_scalp_topography_engaged.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="180px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Per-pattern scalp topography for the 16 patterns from <b>Engaged</b> trials (P1–P16). Each topograph shows where on the scalp that pattern's coefficient is strongest.
</div>

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/eeg_scalp_topography_nonengaged.jpeg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="180px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Same 16-pattern decomposition for <b>Non-Engaged</b> trials, exposing the cross-class differences in spatial pattern expression.
</div>

## 6. Cross-Validated Classification

The same NMF basis doubles as a classifier. 5-fold cross-validation:

1. **Train fold:** factorize training spectrograms `X_train ≈ W_train · H_train`. `H_train` is the learned dictionary.
2. **Test fold:** given test spectrograms `X_test` and the frozen `H_train`, solve for `W'` such that `X_test ≈ W' · H_train` under non-negativity. The paper used **LARS / Lasso** for this constrained-coefficient estimation.
3. **Score:** compute the correlation coefficient between `W'` and `W_train` to measure how well the test trial aligns with the training-set coefficient distribution. Classify by class with higher correlation.

## 7. Preliminary Results

| Split | Engaged Acc. | Non-Engaged Acc. |
|---|---|---|
| 1 | 0.69 | 0.80 |
| 2 | 0.67 | 0.40 |
| 3 | 0.40 | 0.40 |
| 4 | 0.76 | 0.00 |
| 5 | 0.37 | 0.50 |
| **Average** | **0.58 ± 0.16** | **0.42 ± 0.25** |

Non-Engaged accuracy is both lower and higher-variance than Engaged — consistent with the class imbalance in the dataset, which is dominated by Engaged trials.

## 8. Future Work

Items flagged in the slide deck as planned follow-ups:

- **Multi-patient analysis** — generalize the per-class factorization across subjects.
- **Class imbalance** — adjust for the engagement-dominant sampling (re-sampling, weighted losses, focal NMF objectives).
- **Stronger classifier head** — replace correlation similarity with a regression or neural-net head trained on `W'` features.
- **Response-time regression** — predict per-trial response time from the same coefficient features.

## Stack

- **Language / numerics:** Python (NumPy, SciPy, scikit-learn).
- **Time-frequency:** Morlet continuous wavelet transform per channel per trial.
- **Decomposition:** non-negative matrix factorization with rank `k = 16`, applied per class.
- **Coefficient estimation at test time:** LARS / Lasso under non-negativity constraints (`spams` reference implementation).
- **Visualization:** per-pattern scalp topography mapping from 64-electrode coefficient vectors.

## Links

📄 Internal lab work (UCSF Abbasi Lab) — slide deck on file.
