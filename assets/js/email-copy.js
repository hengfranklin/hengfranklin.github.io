// Intercept clicks on the social-icon email link (rendered by jekyll-socials as
// <a href="mailto:..."><i class="fa-solid fa-envelope"></i></a>) and copy the
// address to the clipboard instead of opening the user's mail client. Show a
// small toast notification on success.

(function () {
  function showToast(message) {
    var existing = document.getElementById("email-copy-toast");
    if (existing) existing.remove();

    var toast = document.createElement("div");
    toast.id = "email-copy-toast";
    toast.textContent = message;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);

    // Trigger fade-in on next frame.
    requestAnimationFrame(function () {
      toast.classList.add("show");
    });

    setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 1800);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for older browsers / non-HTTPS contexts.
    return new Promise(function (resolve, reject) {
      var textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(textarea);
      }
    });
  }

  function handleClick(event) {
    event.preventDefault();
    var href = event.currentTarget.getAttribute("href") || "";
    var address = href.replace(/^mailto:/i, "").split("?")[0];
    if (!address) return;
    copyToClipboard(address).then(
      function () {
        showToast("Email copied: " + address);
      },
      function () {
        showToast("Couldn't copy — " + address);
      }
    );
  }

  function wireUp() {
    var links = document.querySelectorAll('a[href^="mailto:"]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener("click", handleClick);
      links[i].setAttribute("title", "Click to copy email");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireUp);
  } else {
    wireUp();
  }
})();
