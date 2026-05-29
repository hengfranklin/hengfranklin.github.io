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
          description: "Peer-reviewed papers, patents, and conference abstracts in reverse chronological order. Toggle between Publications and Abstracts below.",
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
          description: "In-situ stem width phenotyping pipeline for corn and sorghum from RGB + depth on a moving robot. Faster R-CNN detection, morphological boundary modeling, RANSAC line fits, and depth-based metric conversion. Published in Electronic Imaging (SPIE 2019).",
          section: "Projects",handler: () => {
              window.location.href = "/projects/08_sorghum/";
            },},{id: "projects-brain-age-prediction-ucsf-sohn-lab",
          title: 'Brain age prediction (UCSF Sohn Lab)',
          description: "A custom 3D CNN predicts perceived brain age from non-contrast head CT. The perceived-to-actual age discrepancy (PTAD) becomes a per-patient feature, regressed against a panel of systemic diseases via univariate and multivariate logistic GLMs.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/11_brain_age/";
            },},{id: "projects-mucus-plug-segmentation-ucsf-fahy-lab",
          title: 'Mucus plug segmentation (UCSF Fahy Lab)',
          description: "Image-processing pipeline that turns radiologist annotations on chest CT into 3D per-plug segmentations, anatomic airway localization, and modeled airflow-resistance metrics. Published in JCI Insight (2024).",
          section: "Projects",handler: () => {
              window.location.href = "/projects/10_mucus_plug/";
            },},{id: "projects-eeg-engagement-decoding-ucsf-abbasi-lab",
          title: 'EEG engagement decoding (UCSF Abbasi Lab)',
          description: "Signal-processing pipeline for decoding attentional engagement from 64-channel EEG. Morlet wavelet time-frequency analysis, non-negative matrix factorization for interpretable pattern extraction, scalp-topography mapping, and cross-validated classification by reusing the learned NMF dictionary.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/12_eeg_engagement/";
            },},{id: "projects-breathily",
          title: 'Breathily',
          description: "Contactless pulmonary function testing for ALS and neuromuscular patients using an Intel RealSense depth camera. Cubemos 18-joint skeleton tracking, a 6-stage depth filter chain, skeleton-derived chest ROI, peak-detected respiratory keypoints, regression depth-to-volume calibration, and a full PFT panel from chest wall motion. US Patent.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/09_breathily/";
            },},{id: "projects-carbon-sink-rate-tracking",
          title: 'Carbon sink rate tracking',
          description: "Computer vision pipeline that turns underwater imagery from custom ocean satellite buoys into per-batch sink rate equations for carbon verification. Frame-quality filtering, instance segmentation of biomaterial, floating-vs-sinking classification by segmentation midpoint, and exponential-decay fitting.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/06_running_tide_sink/";
            },},{id: "projects-robotic-shellfish-counter",
          title: 'Robotic shellfish counter',
          description: "Computer vision pipeline that counts ~1,000 shellfish per frame at 0.125 s/image on Running Tide&#39;s catamaran processing boat. Faster R-CNN with anchor scales tuned for 2×2 px objects, plus a custom small-object post-processing pass, evaluated by absolute counting error against human counts.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/07_shellfish/";
            },},{id: "projects-kelp-phenotyping",
          title: 'Kelp phenotyping',
          description: "Two generations of computer vision for measuring harvested kelp blades. V2 reconstructs individual blades in 3D through frame extraction, color correction, blade masking, COLMAP structure from motion, ArUco metric scaling, and convex-hull and bounding-box measurement. V1 measures whole plants in 2D with Faster R-CNN detection.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/04_kelp_3d/";
            },},{id: "projects-make-the-dot",
          title: 'Make The Dot',
          description: "Sketch-to-render apparel system. A flat sketch plus a hex color plus a prompt become a photorealistic studio garment render. SDXL (juggernaut_x_v10) with one ControlNet-Union model, wash-specific LoRAs hot-swapped via TensorRT refit, a multi-stage LAB+HSV+CIEDE2000 recolor, served on H100 through Triton, Celery, and a FastAPI gateway.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/01_make_the_dot/";
            },},{id: "projects-foia-fluent",
          title: 'FOIA Fluent',
          description: "Civic AI for public records. Multi-source document discovery, anti-hallucination request drafting grounded in statute + eCFR + outcomes, a 19-source live signals ingest, LLM-driven cross-source pattern detection, and a tool-using chat assistant with 4-tier accuracy escalation.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/02_foia_fluent/";
            },},{
        id: 'social-cv',
        title: 'CV',
        section: 'Socials',
        handler: () => {
          window.open("/cv/", "_blank");
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
