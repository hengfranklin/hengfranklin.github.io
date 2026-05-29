---
layout: page
permalink: /publications/
title: publications
description: Peer-reviewed papers, patents, and conference abstracts in reverse chronological order. Toggle between Publications and Abstracts below.
nav: true
nav_order: 3
---

<!-- _pages/publications.md -->

<!-- Publications / Abstracts toggle -->
<ul class="nav nav-pills mb-3" id="pubAbstractTab" role="tablist">
  <li class="nav-item" role="presentation">
    <a class="nav-link active" id="publications-tab" data-toggle="pill" href="#publications-pane" role="tab" aria-controls="publications-pane" aria-selected="true">Publications</a>
  </li>
  <li class="nav-item" role="presentation">
    <a class="nav-link" id="abstracts-tab" data-toggle="pill" href="#abstracts-pane" role="tab" aria-controls="abstracts-pane" aria-selected="false">Abstracts</a>
  </li>
</ul>

<!-- Bibsearch Feature -->

{% include bib_search.liquid %}

<div class="tab-content" id="pubAbstractTabContent">
  <div class="tab-pane fade show active" id="publications-pane" role="tabpanel" aria-labelledby="publications-tab">
    <div class="publications">
      {% bibliography --query @*[category=publication]* %}
    </div>
  </div>
  <div class="tab-pane fade" id="abstracts-pane" role="tabpanel" aria-labelledby="abstracts-tab">
    <div class="publications">
      {% bibliography --query @*[category=abstract]* %}
    </div>
  </div>
</div>
