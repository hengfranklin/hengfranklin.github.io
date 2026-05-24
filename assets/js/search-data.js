// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-projects",
          title: "projects",
          description: "Selected work in computer vision, ML, and full-stack AI engineering.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "nav-publications",
          title: "publications",
          description: "Selected publications and patents in reverse chronological order.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/publications/";
          },
        },{id: "nav-cv",
          title: "CV",
          description: "Resume and CV.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/cv/";
          },
        },{id: "projects-crop-stem-width-phenotyping",
          title: 'Crop stem width phenotyping',
          description: "In-situ stem width phenotyping pipeline for corn and sorghum from RGB + depth on a moving robot. Faster R-CNN detection, morphological boundary modeling, RANSAC line fits, and depth-based metric conversion. Published in Electronic Imaging (SPIE 2018/2019).",
          section: "Projects",handler: () => {
              window.location.href = "/projects/08_sorghum/";
            },},{id: "projects-brain-age-prediction-ucsf-sohn-lab",
          title: 'Brain age prediction (UCSF Sohn Lab)',
          description: "3D CNN that predicts perceived brain age from non-contrast head CT; the perceived-to-actual age discrepancy (PTAD) is regressed against a panel of systemic diseases via a logistic GLM.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/11_brain_age/";
            },},{id: "projects-mucus-plug-segmentation-ucsf-fahy-lab",
          title: 'Mucus plug segmentation (UCSF Fahy Lab)',
          description: "Image-processing pipeline that turns radiologist annotations on chest CT into 3D per-plug segmentations, anatomic airway localization, and modeled airflow-resistance metrics. Published in JCI Insight (2024).",
          section: "Projects",handler: () => {
              window.location.href = "/projects/10_mucus_plug/";
            },},{id: "projects-eeg-engagement-decoding-ucsf-abbasi-lab",
          title: 'EEG engagement decoding (UCSF Abbasi Lab)',
          description: "Signal-processing pipeline for decoding attentional engagement from 64-channel EEG. Morlet wavelet time-frequency analysis, non-negative matrix factorization for interpretable pattern extraction, scalp-topography analysis, and cross-validated classification via NMF reconstruction.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/12_eeg_engagement/";
            },},{id: "projects-breathily",
          title: 'Breathily',
          description: "Contactless lung function for ALS patients using Intel RealSense depth cameras. Real-time skeleton-tracked chest ROI, 6-stage depth filter chain, regression-based depth-to-volume calibration, full PFT panel from chest wall motion. US Patent.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/09_breathily/";
            },},{id: "projects-carbon-sink-rate-tracking",
          title: 'Carbon sink rate tracking',
          description: "Computer vision pipeline that turns underwater imagery from custom ocean satellite buoys into per-batch sink rate curves for carbon verification. Frame quality filtering, instance segmentation of biomaterial, area-over-time decay fitting.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/06_running_tide_sink/";
            },},{id: "projects-robotic-shellfish-counter",
          title: 'Robotic shellfish counter',
          description: "Computer vision pipeline that counts ~1,000 shellfish per frame at 0.125 s/image on Running Tide&#39;s catamaran processing boat. Faster R-CNN with anchor box scales tuned for 2×2 px objects, with a custom small-object refinement pass.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/07_shellfish/";
            },},{id: "projects-kelp-phenotyping",
          title: 'Kelp phenotyping',
          description: "Two generations of computer vision for measuring harvested kelp blades. Overhead 2D imaging of whole plants, then multi-view 3D reconstruction of individual blades.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/04_kelp_3d/";
            },},{id: "projects-make-the-dot",
          title: 'Make The Dot',
          description: "Sketch-to-image apparel render system. SDXL + ControlNet-Union + custom wash LoRAs, served on H100 with TensorRT.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/01_make_the_dot/";
            },},{id: "projects-foia-fluent",
          title: 'FOIA Fluent',
          description: "Civic AI for public records. Multi-source document discovery, anti-hallucination request drafting grounded in statute + eCFR + outcomes, real-time 19-source signals ingest, LLM-driven cross-source pattern detection, and a tool-using chat assistant with 4-tier accuracy escalation.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/02_foia_fluent/";
            },},{
        id: 'social-cv',
        title: 'CV',
        section: 'Socials',
        handler: () => {
          window.open("/assets/pdf/franklin_heng_resume.pdf", "_blank");
        },
      },{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%68%65%6E%67.%66%72%61%6E%6B%6C%69%6E@%67%6D%61%69%6C.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/hengfranklin", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/franklinheng", "_blank");
        },
      },{
        id: 'social-scholar',
        title: 'Google Scholar',
        section: 'Socials',
        handler: () => {
          window.open("https://scholar.google.com/citations?user=toxljCEAAAAJ", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
