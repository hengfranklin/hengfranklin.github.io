---
layout: page
title: projects
permalink: /projects/
description: Selected work in computer vision, ML, and full-stack AI engineering.
nav: true
nav_order: 2
---

{% assign cv_ml = site.projects | where: "category", "cv-ml" | sort: "importance" %}
{% assign ai_eng = site.projects | where: "category", "ai-engineering" | sort: "importance" %}
{% assign earlier = site.projects | where: "category", "earlier-work" | sort: "importance" %}

{% if cv_ml.size > 0 %}
  <section class="projects-page-section">
    <header class="projects-section-header">
      <h2>Computer Vision &amp; ML</h2>
      <span class="section-count">{{ cv_ml.size }} projects</span>
    </header>
    {% assign cv_ml_groups = cv_ml | group_by: "affiliation" %}
    {% for group in cv_ml_groups %}
      <div class="projects-subgroup">
        <h3 class="projects-subgroup-title">{{ group.name }}</h3>
        <div class="projects-grid projects-grid-compact">
          {% for project in group.items %}
            {% include projects_card.liquid %}
          {% endfor %}
        </div>
      </div>
    {% endfor %}
  </section>
{% endif %}

{% if ai_eng.size > 0 %}
  <section class="projects-page-section">
    <header class="projects-section-header">
      <h2>Full-Stack AI Engineering</h2>
      <span class="section-count">{{ ai_eng.size }} projects</span>
    </header>
    <div class="projects-grid projects-grid-compact">
      {% for project in ai_eng %}
        {% include projects_card.liquid %}
      {% endfor %}
    </div>
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
