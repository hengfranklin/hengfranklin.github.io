---
layout: page
title: portfolio
permalink: /projects/
description: Selected work in computer vision, ML, and full-stack AI engineering.
nav: true
nav_order: 2
---

{% assign cv_ml = site.projects | where: "category", "cv-ml" | sort: "date" | reverse %}
{% assign ai_eng = site.projects | where: "category", "ai-engineering" | sort: "date" | reverse %}
{% assign earlier = site.projects | where: "category", "earlier-work" | sort: "date" | reverse %}

{% if cv_ml.size > 0 %}

  <section class="projects-page-section">
    <header class="projects-section-header">
      <h2>Computer Vision &amp; ML</h2>
      <span class="section-count">{{ cv_ml.size }} projects</span>
    </header>
    {% assign cv_ml_groups = cv_ml | group_by: "affiliation" %}
    <ol class="work-timeline">
      {% for group in cv_ml_groups %}
        {% assign lead = group.items | first %}
        <li class="timeline-entry">
          <div class="timeline-marker" aria-hidden="true"></div>
          <div class="timeline-content">
            <header class="timeline-header">
              <h3 class="timeline-org">{{ group.name }}</h3>
              <span class="timeline-years">{{ lead.affiliation_years }}</span>
            </header>
            <div class="projects-grid projects-grid-compact">
              {% for project in group.items %}
                {% include projects_card.liquid %}
              {% endfor %}
            </div>
          </div>
        </li>
      {% endfor %}
    </ol>
  </section>
{% endif %}

{% if ai_eng.size > 0 %}

  <section class="projects-page-section">
    <header class="projects-section-header">
      <h2>Full-Stack AI Engineering</h2>
      <span class="section-count">{{ ai_eng.size }} projects</span>
    </header>
    {% assign ai_eng_groups = ai_eng | group_by: "affiliation" %}
    <ol class="work-timeline">
      {% for group in ai_eng_groups %}
        {% assign lead = group.items | first %}
        <li class="timeline-entry">
          <div class="timeline-marker" aria-hidden="true"></div>
          <div class="timeline-content">
            <header class="timeline-header">
              <h3 class="timeline-org">{{ group.name }}</h3>
              <span class="timeline-years">{{ lead.affiliation_years }}</span>
            </header>
            <div class="projects-grid projects-grid-compact">
              {% for project in group.items %}
                {% include projects_card.liquid %}
              {% endfor %}
            </div>
          </div>
        </li>
      {% endfor %}
    </ol>
  </section>
{% endif %}

{% if earlier.size > 0 %}

  <section class="projects-page-section">
    <header class="projects-section-header">
      <h2>Earlier Work</h2>
      <span class="section-count">{{ earlier.size }} projects</span>
    </header>
    <div class="projects-grid projects-grid-compact">
      {% for project in earlier %}
        {% include projects_card.liquid %}
      {% endfor %}
    </div>
  </section>
{% endif %}
